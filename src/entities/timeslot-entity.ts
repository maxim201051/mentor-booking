import z from "zod";
import { v4 as uuidv4 } from 'uuid';

export const TimeSlotSchema = z.object({
    id: z.string().default(() => uuidv4()),
    mentorId: z.string().nonempty("mentorId is required"),
    startDate: z.string().nonempty("mentorId is required").transform((date) => new Date(date)),
    endDate: z.string().nonempty("mentorId is required").transform((date) => new Date(date)),
    isBooked: z.boolean().optional().default(false),
}).refine(
    (data) => new Date(data.endDate) > new Date(data.startDate), 
    { message: "endDate must be after startDate", path: ["endDate"] }
);

export type TimeSlotEntity = z.infer<typeof TimeSlotSchema>;
