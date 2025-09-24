import { BookingService } from "../../src/services/booking-service";
import { TimeSlotService } from "../../src/services/timeslot-service";
import { BookingRepository } from "../../src/repositories/booking-repository";
import { BookingEntity } from "../../src/entities/booking-entity";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";

describe("BookingService Tests", () => {
    let bookingService: BookingService;
    let mockBookingRepository: jest.Mocked<BookingRepository>;
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;

    beforeEach(() => {
        mockBookingRepository = {
            createBooking: jest.fn(),
            getBookingsByStudentId: jest.fn(),
            getBookingById: jest.fn(),
            deleteBookingById: jest.fn(),
            getBookingsByMentorId: jest.fn(),
            getAllBookings: jest.fn(),
        } as unknown as jest.Mocked<BookingRepository>;

        mockTimeSlotService = {
            getTimeSlotById: jest.fn(),
        } as unknown as jest.Mocked<TimeSlotService>;

        bookingService = new BookingService(mockBookingRepository, mockTimeSlotService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const booking1: BookingEntity = {
        id: "booking-1",
        studentId: "student-1",
        mentorId: "mentor-1",
        timeslotId: "timeslot-1",
        status: "confirmed",
    };

    const booking2: BookingEntity = {
        id: "booking-2",
        studentId: "student-2",
        mentorId: "mentor-2",
        timeslotId: "timeslot-2",
        status: "completed",
    };

    const upcomingTimeSlot: TimeSlotEntity = {
        id: "timeslot-1",
        mentorId: "mentor-1",
        isBooked: true,
        startDate: new Date(Date.now() + 10000), 
        endDate: new Date(Date.now() + 20000), 
    };

    const pastTimeSlot: TimeSlotEntity = {
        id: "timeslot-2",
        mentorId: "mentor-2",
        isBooked: true,
        startDate: new Date(Date.now() - 20000), 
        endDate: new Date(Date.now() - 10000), 
    };

    test("createBooking should create and return a booking entity", async () => {
        mockBookingRepository.createBooking.mockResolvedValueOnce();

        const result = await bookingService.createBooking(booking1);

        expect(mockBookingRepository.createBooking).toHaveBeenCalledWith(booking1);
        expect(result).toEqual(booking1);
    });

    test("getBookingsByStudentId should return all bookings for a student", async () => {
        mockBookingRepository.getBookingsByStudentId.mockResolvedValueOnce([booking1]);

        const result = await bookingService.getBookingsByStudentId("student-1");

        expect(mockBookingRepository.getBookingsByStudentId).toHaveBeenCalledWith("student-1");
        expect(result).toEqual([booking1]);
    });

    test("getBookingById should return the booking when it exists", async () => {
        mockBookingRepository.getBookingById.mockResolvedValueOnce(booking1);

        const result = await bookingService.getBookingById("booking-1");

        expect(mockBookingRepository.getBookingById).toHaveBeenCalledWith("booking-1");
        expect(result).toEqual(booking1);
    });

    test("getBookingById should return null if booking does not exist", async () => {
        mockBookingRepository.getBookingById.mockResolvedValueOnce(null);

        const result = await bookingService.getBookingById("non-existent-booking");

        expect(result).toBeNull();
    });

    test("deleteBookingById should delete a booking by ID", async () => {
        mockBookingRepository.deleteBookingById.mockResolvedValueOnce();

        await bookingService.deleteBookingById("booking-1");

        expect(mockBookingRepository.deleteBookingById).toHaveBeenCalledWith("booking-1");
    });

    test("isStudentHasOverlappingBookings should return true for overlapping bookings", async () => {
        mockBookingRepository.getBookingsByStudentId.mockResolvedValueOnce([booking1]);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(upcomingTimeSlot);

        const result = await bookingService.isStudentHasOverlappingBookings(
            "student-1",
            new Date(Date.now() + 5000),
            new Date(Date.now() + 15000)
        );

        expect(result).toBe(true);
        expect(mockBookingRepository.getBookingsByStudentId).toHaveBeenCalledWith("student-1");
        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
    });

    test("isStudentHasOverlappingBookings should return false when no bookings overlap", async () => {
        mockBookingRepository.getBookingsByStudentId.mockResolvedValueOnce([booking1]);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(pastTimeSlot);

        const result = await bookingService.isStudentHasOverlappingBookings(
            "student-1",
            new Date(Date.now() + 5000),
            new Date(Date.now() + 15000)
        );

        expect(result).toBe(false);
    });

    test("getBookingsByMentorIdWithFilters should return filtered bookings", async () => {
        mockBookingRepository.getBookingsByMentorId.mockResolvedValueOnce([booking1, booking2]);
        jest.spyOn(bookingService, "filterBookings").mockResolvedValueOnce([booking1]);

        const queryParams = { type: "upcoming" };
        const result = await bookingService.getBookingsByMentorIdWithFilters("mentor-1", queryParams);

        expect(bookingService.filterBookings).toHaveBeenCalledWith([booking1, booking2], queryParams);
        expect(result).toEqual([booking1]);
    });

    test("filterBookings should exclude past bookings for 'upcoming' filter", async () => {
        const queryParams = { type: "upcoming" };
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(upcomingTimeSlot);

        const result = await bookingService.filterBookings([booking1], queryParams);

        expect(result).toEqual([booking1]);
    });

    test("filterBookings should exclude upcoming bookings for 'past' filter", async () => {
        const queryParams = { type: "past" };
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(pastTimeSlot);

        const result = await bookingService.filterBookings([booking2], queryParams);

        expect(result).toEqual([booking2]);
    });

    test("getAllBookings should return all bookings", async () => {
        mockBookingRepository.getAllBookings.mockResolvedValueOnce([booking1, booking2]);

        const result = await bookingService.getAllBookings();

        expect(mockBookingRepository.getAllBookings).toHaveBeenCalled();
        expect(result).toEqual([booking1, booking2]);
    });
});