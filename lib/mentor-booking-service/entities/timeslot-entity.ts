import z from "zod";

export interface TimeSlotEntity {
    id: string,
    mentorId: string,
    startDate: Date,
    endDate: Date,
    isBooked: boolean,
}

export const TimeSlotSchema = z.object({
    is: z.string(),
    mentorId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    isBooked: z.boolean(),
})
