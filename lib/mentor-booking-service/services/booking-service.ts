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

    async getBookingById(bookingId: string): Promise<BookingEntity|null> {
        return await this.bookingRepository.getBookingById(bookingId);
    }

    async deleteBookingById(bookingId: string): Promise<void> {
        await this.bookingRepository.deleteBookingById(bookingId);
    }
    
}