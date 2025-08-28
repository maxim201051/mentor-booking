import z from "zod";
import { UserEntity, UserSchema } from "./user-entity";

export interface MentorEntity extends UserEntity {
    skills: string[],
    experience: number,
}

export const MentorSchema = UserSchema.extend({
    skills: z.array(z.string()),
    experience: z.number(),
})
