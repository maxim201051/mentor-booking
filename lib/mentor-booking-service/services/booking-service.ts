import { BookingEntity } from "../entities/booking-entity";
import { BookingRepository } from "../repositories/booking-repository";

export class BookingService {
    private readonly bookingRepository: BookingRepository;

    constructor(bookingRepository: BookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    async createBooking(booking: BookingEntity): Promise<BookingEntity> {
        await this.bookingRepository.createBooking(booking);
        return booking;
    }

    async getBookingsByStudentId(studentId: string): Promise<BookingEntity[]> {
        return await this.bookingRepository.getBookingsByStudentId(studentId);
    }

    async deleteBookingById(bookingId: string, studentId: string): Promise<BookingEntity> {
        const booking: BookingEntity|null = await this.bookingRepository.getBookingById(bookingId);
        if(!booking) {
            throw new Error('Booking with such id does not exist')
        }
        if(studentId !== booking.studentId) {
            throw new Error('Access denied. Cannot delete booking owned by another student')
        }
        await this.bookingRepository.deleteBookingById(bookingId);
        return booking;
    }
    
}