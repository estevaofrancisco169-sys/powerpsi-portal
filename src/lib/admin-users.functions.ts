import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  criarUsuarioAdmin,
  exigirAdmin,
  redefinirSenhaAdmin,
  removerUsuarioAdmin,
} from "./admin-users.server";

const novoUsuarioSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo").max(120),
    email: z.string().trim().email("E-mail inválido").max(255),
    senha: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72),
    // Documento só é obrigatório para aluno — administrador não precisa.
    documento_tipo: z.enum(["cpf", "cnpj"]).optional(),
    documento: z.string().trim().max(20).optional(),
    role: z.enum(["aluno", "admin"]),
  })
  // Única fonte de verdade para validar o documento: limpa a máscara e
  // compara a quantidade de dígitos esperada para cpf/cnpj, com mensagem
  // sempre amigável — nunca deixa um erro técnico do Zod vazar cru.
  // Para admin, o documento é ignorado por completo.
  .superRefine((data, ctx) => {
    if (data.role === "admin") return;

    if (!data.documento_tipo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento_tipo"],
        message: "Informe o tipo de documento (CPF ou CNPJ).",
      });
      return;
    }
    const digitos = (data.documento ?? "").replace(/\D/g, "");
    const esperado = data.documento_tipo === "cpf" ? 11 : 14;
    if (digitos.length !== esperado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: data.documento_tipo === "cpf" ? "CPF inválido." : "CNPJ inválido.",
      });
    }
  });

/** Envolve o parse do Zod para nunca deixar um ZodError cru chegar ao cliente. */
function validarEntrada<T>(schema: z.ZodType<T>, data: unknown): T {
  const resultado = schema.safeParse(data);
  if (!resultado.success) {
    const primeira = resultado.error.errors[0];
    throw new Error(primeira?.message ?? "Dados inválidos.");
  }
  return resultado.data;
}

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => validarEntrada(novoUsuarioSchema, data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);
    // A checagem de dígitos já aconteceu no schema (superRefine) —
    // não duplicamos a lógica aqui.
    return criarUsuarioAdmin(data);
  });

export const removerUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => validarEntrada(z.object({ id: z.string().uuid() }), data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);
    await removerUsuarioAdmin(data.id, context.userId);
    return { ok: true };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    validarEntrada(z.object({ id: z.string().uuid(), senha: z.string().min(8).max(72) }), data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);
    return redefinirSenhaAdmin(data.id, data.senha);
  });
