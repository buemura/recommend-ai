import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  safeParseJson,
  registerSchema,
  formatZodError,
} from "@/lib/validation";

export async function POST(request: Request) {
  const { data, error } = await safeParseJson(request);
  if (error) return error;

  const result = registerSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json(
      { error: formatZodError(result.error) },
      { status: 400 }
    );
  }

  const { name, email, password } = result.data;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((rows) => rows[0]);

  if (existingUser) {
    return NextResponse.json(
      { error: "Este email já está cadastrado." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, password: hashedPassword })
    .returning({ id: users.id });

  return NextResponse.json(
    { message: "Conta criada com sucesso!", userId: newUser.id },
    { status: 201 }
  );
}
