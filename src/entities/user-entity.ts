import z from "zod"
import { v4 as uuidv4 } from 'uuid';

export const UserSchema = z.object({
    id: z.string().default(() => uuidv4()),
    fullName: z.string().nonempty("fullName is required"),
    email: z.string().nonempty("email is required"),
});

export type UserEntity = z.infer<typeof UserSchema>;
