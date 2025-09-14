import { BookingService } from "./services/booking-service";
import { TimeSlotService } from "./services/timeslot-service";
import { BookingEntity } from "./entities/booking-entity";
import { BookingRepository } from "./repositories/booking-repository";
import { TimeSlotRepository } from "./repositories/timeslot-repository";

const timeSlotService = new TimeSlotService(
    new TimeSlotRepository(
        process.env.TIMESLOTS_TABLE_NAME || '',
        process.env.REGION
    ), 
);

const bookingService = new BookingService(
    new BookingRepository(
        process.env.BOOKINGS_TABLE_NAME || '',
        process.env.REGION
    ),
);

const timeSlotService = new TimeSlotService(
    process.env.TIMESLOTS_TABLE_NAME || '',
    process.env.REGION 
);

export const main = async (event: any) => {
    try {
        const bookingId = event.pathParameters?.bookingId;
        const auth = event.headers?.auth;
        if(!bookingId) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                error: 'bookingId is required in the path parameters',
              }),
            };
        };
        if(!auth) {
            return {
              statusCode: 401,
              body: JSON.stringify({
                error: 'auth is required in the query parameters',
              }),
            };
        };
        const deletedBooking = await bookingService.deleteBookingById(bookingId, auth);
        await timeSlotService.markTimeslotAsNonBooked(deletedBooking.timeslotId);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Booking was successfully deleted',
            }),
        };
    } catch (error) {
       return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
       };
    }
}