import z from "zod";

export interface TimeSlotEntity {
    id: string,
    mentorId: string,
    startDate: Date,
    endDate: Date,
    isBooked: boolean,
}

export const TimeSlotSchema = z.object({
    id: z.string(),
    mentorId: z.string(),
    startDate: z.string().transform((date) => new Date(date)),
    endDate: z.string().transform((date) => new Date(date)),
    isBooked: z.boolean(),
})
