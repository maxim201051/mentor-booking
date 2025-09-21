import { EmailNotificationService } from "../services/email-notification-service";
import { BookingNotificationEntity, BookingNotificationEntitySchema } from "../entities/booking-notification-entity";
import { SESClient } from "@aws-sdk/client-ses";

const emailNotificationService = new EmailNotificationService(
    new SESClient({ 
        region: process.env.REGION 
    }),
)

export const main = async (event: any) => {
    return await handleNotifyAboutBooking(event, { emailNotificationService })
}

export const handleNotifyAboutBooking = async (event: any, dependencies: { emailNotificationService: EmailNotificationService }) => {
    try {
        for (const record of event.Records) {
            const bookingEvent: BookingNotificationEntity = BookingNotificationEntitySchema.parse(JSON.parse(record.body));
            if (bookingEvent.type !== "booking.created" && bookingEvent.type !== "booking.cancelled") {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: 'Unexpected event type',
                    }),
                };
            }
            await dependencies.emailNotificationService.notifyAboutBooking(bookingEvent);
        }
    
        return {
            message: "Notifications processed",
        };
    } catch (error) {
        console.error(error);
        throw error;
    }
}
