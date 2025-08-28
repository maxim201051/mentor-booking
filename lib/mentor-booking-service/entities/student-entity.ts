import { UserEntity, UserSchema } from "./user-entity";

export interface StudentEntity extends UserEntity {
 
}

export const StudentSchema = UserSchema
