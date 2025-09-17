import z from "zod"

export interface UserEntity {
    id: string,
    fullName: string,
    email: string    
}

export const UserSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string(),
})
