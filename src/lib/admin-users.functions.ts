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
    documento_tipo: z.enum(["cpf", "cnpj"]),
    documento: z.string().trim().min(1, "Informe o documento").max(20),
    role: z.enum(["aluno", "admin"]),
  })
  .superRefine((data, ctx) => {
    const digitos = data.documento.replace(/\D/g, "");

    const esperado = data.documento_tipo === "cpf" ? 11 : 14;

    if (digitos.length !== esperado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message:
          data.documento_tipo === "cpf"
            ? "CPF inválido. Informe 11 dígitos."
            : "CNPJ inválido. Informe 14 dígitos.",
      });
    }
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => novoUsuarioSchema.parse(data))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);

    const digitos = data.documento.replace(/\D/g, "");

    const esperado = data.documento_tipo === "cpf" ? 11 : 14;

    if (digitos.length !== esperado) {
      throw new Error(
        data.documento_tipo === "cpf"
          ? "CPF inválido."
          : "CNPJ inválido.",
      );
    }

    return criarUsuarioAdmin({
      ...data,
      documento: digitos,
    });
  });

export const removerUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);
    await removerUsuarioAdmin(data.id, context.userId);
    return { ok: true };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      senha: z.string().min(8).max(72),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.userId);
    return redefinirSenhaAdmin(data.id, data.senha);
  });
