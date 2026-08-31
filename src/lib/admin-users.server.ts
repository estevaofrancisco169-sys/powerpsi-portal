import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NovoUsuario = {
  nome: string;
  email: string;
  senha: string;
  documento: string;
  documento_tipo: "cpf" | "cnpj";
  role: "aluno" | "admin";
};

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

/** Garante que quem chamou a função é administrador. */
export async function exigirAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Não foi possível validar suas permissõe");
  if (!data) throw new Error("Apenas administradores podem gerenciar usuários.");
}

export async function razaoSocialPorCnpj(cnpj: string) {
  const digitos = cnpj.replace(/\D/g, "");
  const { data } = await supabaseAdmin.from("companies").select("cnpj,razao_social,ativo");
  const achado = (data ?? []).find((c) => c.cnpj.replace(/\D/g, "") === digitos && c.ativo);
  return achado?.razao_social ?? null;
}

export async function criarUsuarioAdmin(input: NovoUsuario) {
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
    throw new Error(
      msg.includes("already") || msg.includes("registered")
        ? "Já existe um usuário com este e-mail."
        : "Não foi possível criar o usuário.",
    );
  }

  // Reforça perfil e papel caso o gatilho não tenha recebido tudo.
  await supabaseAdmin.from("profiles").upsert(
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
  await supabaseAdmin.from("user_roles").upsert(
    { user_id: data.user.id, role: input.role },
    { onConflict: "user_id,role" },
  );
  if (input.role === "admin") {
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user.id).eq("role", "aluno");
  }

  return { id: data.user.id, empresa };
}

export async function removerUsuarioAdmin(id: string, solicitante: string) {
  if (id === solicitante) throw new Error("Você não pode remover a sua própria conta.");

  // Não há chave estrangeira para auth.users: limpamos os dados vinculados manualmente.
  await supabaseAdmin.from("video_views").delete().eq("user_id", id);
  await supabaseAdmin.from("access_logs").delete().eq("user_id", id);
  await supabaseAdmin.from("active_sessions").delete().eq("user_id", id);
  await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
  await supabaseAdmin.from("profiles").delete().eq("id", id);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error && !/not found/i.test(error.message)) {
    throw new Error(`Não foi possível remover o usuário: ${error.message}`);
  }
}

export async function redefinirSenhaAdmin(id: string, senha: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: senha });
  if (error) return { ok: false as const, mensagem: mensagemSenha(error.message) };
  return { ok: true as const };
}
