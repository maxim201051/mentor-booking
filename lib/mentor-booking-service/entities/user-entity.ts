import z from "zod"

export interface UserEntity {
    id: string,
    name: string,
    email: string    
}

export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
})
