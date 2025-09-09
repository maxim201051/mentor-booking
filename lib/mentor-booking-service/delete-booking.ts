import { BookingService } from "./services/booking-service";
import { TimeSlotService } from "./services/timeslot-service";

const bookingService = new BookingService(
    process.env.BOOKINGS_TABLE_NAME || '',
    process.env.REGION 
);

const timeSlotService = new TimeSlotService(
    process.env.TIMESLOTS_TABLE_NAME || '',
    process.env.REGION 
);

export const main = async (event: any) => {
    try {
        const bookingId = event.pathParameters?.bookingId;
        const auth = event.queryStringParameters?.auth;
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
            body: "Booking was successfully deleted"
        };
    } catch (error: any) {
       return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
       };
    }
}