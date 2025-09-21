import z from "zod";
import { UserEntity, UserSchema } from "./user-entity";

export const MentorSchema = UserSchema.extend({
    skills: z.array(z.string()).nonempty("skills is required"),
    experience: z.number().nonoptional("experience is required"),
});

export type MentorEntity = z.infer<typeof MentorSchema>;
