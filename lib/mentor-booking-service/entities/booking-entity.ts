import { z } from "zod";

export interface BookingEntity {
    id: string,
    mentorId: string,
    studentId: string,
    timeslotId: string,
    status: string,
}

export const BookingSchema = z.object({
    id: z.string(),
    mentorId: z.string(),
    studentId: z.string(),
    timeslotId: z.string(),
    status: z.string(),
})
