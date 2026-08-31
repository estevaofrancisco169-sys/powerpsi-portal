import { supabaseAdmin } from "@/integrations/supabase/client.server";
 
export type NovoUsuario = {
  nome: string;
  email: string;
  senha: string;
  documento: string;
  documento_tipo: "cpf" | "cnpj";
  role: "aluno" | "admin";
};
 
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
/** Traduz erros de senha do serviço de autenticação. */
function mensagemSenha(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("weak") || m.includes("pwned") || m.includes("easy to guess")) {
    return "Senha muito fraca ou já vazada em outros sites. Use uma senha única com pelo menos 8 caracteres, misturando letras, números e símbolos.";
  }
  if (m.includes("at least") || m.includes("should be")) {
    return "Senha inválida: use pelo menos 8 caracteres, com letras, números e símbolos.";
  }
  return `Não foi possível atualizar a senha: ${msg}`;
}
 
/** Valida os campos básicos de um novo usuário antes de tocar no banco. */
function validarNovoUsuario(input: NovoUsuario) {
  if (!input.nome?.trim()) {
    throw new Error("Nome é obrigatório.");
  }
  if (!EMAIL_REGEX.test(input.email ?? "")) {
    throw new Error("E-mail inválido.");
  }
  if (!input.senha || input.senha.length < 8) {
    throw new Error("Senha deve ter pelo menos 8 caracteres.");
  }
  const digitos = (input.documento ?? "").replace(/\D/g, "");
  const tamanhoEsperado = input.documento_tipo === "cnpj" ? 14 : 11;
  if (digitos.length !== tamanhoEsperado) {
    throw new Error(
      input.documento_tipo === "cnpj" ? "CNPJ inválido." : "CPF inválido.",
    );
  }
}
 
/** Garante que quem chamou a função é administrador. */
export async function exigirAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
  console.error("[exigirAdmin] erro real:", error);
  throw new Error("Não foi possível validar suas permissões.");
}
  if (!data) throw new Error("Apenas administradores podem gerenciar usuários.");
}
 
export async function razaoSocialPorCnpj(cnpj: string) {
  const digitos = cnpj.replace(/\D/g, "");
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("razao_social")
    .eq("cnpj", digitos)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar a empresa pelo CNPJ.");
  return data?.razao_social ?? null;
}
 
export async function criarUsuarioAdmin(input: NovoUsuario, solicitanteId: string) {
  await exigirAdmin(solicitanteId);
  validarNovoUsuario(input);
 
  const ehCnpj = input.documento_tipo === "cnpj";
  const empresa = ehCnpj ? await razaoSocialPorCnpj(input.documento) : null;
  if (ehCnpj && !empresa) {
    throw new Error("CNPJ não encontrado na base de empresas clientes. Cadastre a empresa primeiro.");
  }
 
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.senha,
    email_confirm: true,
    user_metadata: {
      nome: input.nome,
      documento: input.documento,
      documento_tipo: input.documento_tipo,
      empresa,
      role: input.role,
    },
  });
 
  if (error || !data.user) {
    const msg = (error?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      throw new Error("Já existe um usuário com este e-mail.");
    }
    if (msg.includes("weak") || msg.includes("pwned") || msg.includes("at least") || msg.includes("should be")) {
      throw new Error(mensagemSenha(error!.message));
    }
    throw new Error("Não foi possível criar o usuário.");
  }
 
  // Reforça perfil e papel caso o gatilho não tenha recebido tudo.
  // Se algo falhar aqui, desfaz a criação no Auth para não deixar usuário órfão.
  try {
    const { error: erroProfile } = await supabaseAdmin.from("profiles").upsert(
      {
        id: data.user.id,
        nome: input.nome,
        email: input.email,
        documento: input.documento,
        documento_tipo: input.documento_tipo,
        cnpj: ehCnpj ? input.documento : null,
        empresa,
      },
      { onConflict: "id" },
    );
    if (erroProfile) throw erroProfile;
 
    const { error: erroRole } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: data.user.id, role: input.role },
      { onConflict: "user_id,role" },
    );
    if (erroRole) throw erroRole;
 
    if (input.role === "admin") {
      const { error: erroLimpeza } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user.id)
        .eq("role", "aluno");
      if (erroLimpeza) throw erroLimpeza;
    }
  } catch (e) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id).catch(() => {
      // Se a limpeza também falhar, não há mais o que fazer aqui além de reportar.
    });
    throw new Error("Não foi possível concluir o cadastro do usuário. Nenhuma alteração foi salva.");
  }
 
  return { id: data.user.id, empresa };
}
 
export async function removerUsuarioAdmin(id: string, solicitante: string) {
  await exigirAdmin(solicitante);
  if (id === solicitante) throw new Error("Você não pode remover a sua própria conta.");
 
  // Não há chave estrangeira para auth.users: limpamos os dados vinculados manualmente.
  // Cada passo é checado; se algum falhar, paramos antes de mexer no Auth para
  // evitar excluir a conta e perder o rastro do que ainda não foi limpo.
  const tabelasRelacionadas = ["video_views", "access_logs", "active_sessions", "user_roles", "profiles"] as const;
  for (const tabela of tabelasRelacionadas) {
    const coluna = tabela === "profiles" ? "id" : "user_id";
    const { error } = await supabaseAdmin.from(tabela).delete().eq(coluna, id);
    if (error) {
      throw new Error(`Não foi possível remover dados relacionados (${tabela}): ${error.message}`);
    }
  }
 
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Não foi possível remover o usuário: ${error.message}`);
  }
}
 
export async function redefinirSenhaAdmin(id: string, senha: string, solicitanteId: string) {
  await exigirAdmin(solicitanteId);
  if (!senha || senha.length < 8) {
    return { ok: false as const, mensagem: "Senha deve ter pelo menos 8 caracteres." };
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: senha });
  if (error) return { ok: false as const, mensagem: mensagemSenha(error.message) };
  return { ok: true as const };
}
