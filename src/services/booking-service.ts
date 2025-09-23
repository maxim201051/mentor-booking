import { BookingEntity } from "../entities/booking-entity";
import { TimeSlotEntity } from "../entities/timeslot-entity";
import { BookingRepository } from "../repositories/booking-repository";
import { TimeSlotService } from "./timeslot-service";

export class BookingService {
    private readonly bookingRepository: BookingRepository;
    private readonly timeslotService: TimeSlotService;

    constructor(bookingRepository: BookingRepository, timeslotService: TimeSlotService) {
        this.bookingRepository = bookingRepository;
        this.timeslotService = timeslotService;
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
    
    async isStudentHasOverlappingBookings(studentId: string, startDate:Date, endDate: Date): Promise<boolean> {
        const studentBookings: BookingEntity[] = await this.getBookingsByStudentId(studentId);
        let studentBookingsTimeSlots: TimeSlotEntity[] = [];
        for (const studentBooking of studentBookings) {
            const timeSlot = await this.timeslotService.getTimeSlotById(studentBooking.timeslotId);
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

    async getBookingsByMentorIdWithFilters(mentorId: string, queryParams: any): Promise<BookingEntity[]> {
        const bookings: BookingEntity[] = await this.bookingRepository.getBookingsByMentorIdWithFilters(mentorId);
        if(queryParams.type === "upcoming") {
            for(const booking of bookings) {
                const timeslot: TimeSlotEntity|null = await this.timeslotService.getTimeSlotById(booking.timeslotId);
                if(!timeslot || timeslot.startDate < new Date()) {
                    bookings.splice(bookings.indexOf(booking), 1);
                }
            }
        }
        if(queryParams.type === "past") {
            for(const booking of bookings) {
                const timeslot: TimeSlotEntity|null = await this.timeslotService.getTimeSlotById(booking.timeslotId);
                if(!timeslot || timeslot.endDate > new Date()) {
                    bookings.splice(bookings.indexOf(booking), 1);
                }
            }
        }
        return bookings;
    }

    async getAllBookings(): Promise<BookingEntity[]> {
        return await this.bookingRepository.getAllBookings();
    }
}