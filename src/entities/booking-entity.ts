import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

export const BookingSchema = z.object({
    id: z.string().default(() => uuidv4()),
    mentorId: z.string().nonempty("mentorId is required"), 
    studentId: z.string().nonempty("studentId is required"), 
    timeslotId: z.string().nonempty("timeslotId is required"),
    status: z.string().default("created"),
});

export type BookingEntity =  z.infer<typeof BookingSchema>;
