import { z } from "zod";

export interface BookingEntity {
    id: string|null,
    mentorId: string,
    studentId: string,
    timeslotId: string,
    status: string,
}

export const BookingSchema = z.object({
    id: z.string().optional(),
    mentorId: z.string().nonempty("mentorId is required"), 
    studentId: z.string().nonempty("studentId is required"), 
    timeslotId: z.string().nonempty("timeslotId is required"),
    status: z.string().nonempty("status is required"),
})
