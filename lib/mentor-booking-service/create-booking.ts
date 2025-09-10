import { BookingEntity, BookingSchema } from "./entities/booking-entity";
import { TimeSlotEntity } from "./entities/timeslot-entity";
import { BookingService } from "./services/booking-service";
import { MentorService } from "./services/mentor-service";
import { TimeSlotService } from "./services/timeslot-service";
import { uuidGenerator } from "./utils/uuid-generator";

const mentorService = new MentorService(
    process.env.MENTORS_TABLE_NAME || '',
    process.env.REGION 
);

const timeSlotService = new TimeSlotService(
    process.env.TIMESLOTS_TABLE_NAME || '',
    process.env.REGION 
);

const bookingService = new BookingService(
    process.env.BOOKINGS_TABLE_NAME || '',
    process.env.REGION 
);

export const main = async (event: any) => {
    try {
        const body = JSON.parse(event.body);
        const booking: BookingEntity = uuidGenerator.generateUuidForEntity(BookingSchema.parse(body));
        const isMentorExists = await mentorService.isMentorExist(booking.mentorId);
        if(!isMentorExists) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid mentor',
                }),
            };
        }
        const timeSlot: TimeSlotEntity|null = await timeSlotService.getTimeSlotById(booking.timeslotId);
        if (!timeSlot || timeSlot.isBooked || timeSlot.mentorId !== booking.mentorId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid timeslot',
                }),
            };
        }
        
        if(await hasOverlappingBookings(booking.studentId, timeSlot.startDate, timeSlot.endDate)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Conflicting booking found for the student during the requested timeslot.',
                }),
              };
        }
        const createdBooking = await bookingService.createBooking(booking);
        await timeSlotService.markTimeslotAsBooked(timeSlot.id);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Booking was successfully created',
                booking: JSON.stringify(createdBooking),
            }),
        }
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
}

const hasOverlappingBookings = async (studentId: string, startDate:Date, endDate: Date): Promise<boolean> => {
    const studentBookings: BookingEntity[] = await bookingService.getBookingsByStudentId(studentId);
    let studentBookingsTimeSlots: TimeSlotEntity[] = [];
    for (const studentBooking of studentBookings) {
        const timeSlot = await timeSlotService.getTimeSlotById(studentBooking.timeslotId);
        if (timeSlot) {
            studentBookingsTimeSlots.push(timeSlot);
        }
    }
    for (const timeslot of studentBookingsTimeSlots) {
        if (timeslot.startDate <= endDate && timeslot.endDate >= startDate) {
            return true;
        }
    }
    return false;
}