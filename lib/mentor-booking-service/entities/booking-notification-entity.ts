import z from "zod";

export const BookingNotificationEntitySchema = z.object({
    type: z.string(),
    bookingId: z.string(),
    studentEmail: z.string(),
    mentorEmail: z.string(),
    studentFullName: z.string(),
    mentorFullName: z.string(),
    startDate: z.string().transform((date) => new Date(date)),
    endDate: z.string().transform((date) => new Date(date)),
});

export type BookingNotificationEntity = z.infer<typeof BookingNotificationEntitySchema>;