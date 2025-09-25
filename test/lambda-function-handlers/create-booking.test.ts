import { MentorService } from "../../src/services/mentor-service";
import { TimeSlotService } from "../../src/services/timeslot-service";
import { BookingService } from "../../src/services/booking-service";
import { StudentService } from "../../src/services/student-service";
import { SQSClient } from "@aws-sdk/client-sqs";
import { StudentEntity } from "../../src/entities/student-entity";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { BookingEntity } from "../../src/entities/booking-entity";
import { handleCreateBooking } from "../../src/handlers/create-booking";

jest.mock("@aws-sdk/client-sqs", () => ({
    SQSClient: jest.fn(() => ({
        send: jest.fn(),
    })),
    SendMessageCommand: jest.requireActual("@aws-sdk/client-sqs").SendMessageCommand,
}));

describe("handleCreateBooking Tests", () => {
    let mockMentorService: jest.Mocked<MentorService>;
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;
    let mockBookingService: jest.Mocked<BookingService>;
    let mockStudentService: jest.Mocked<StudentService>;
    let mockSQSClient: jest.Mocked<SQSClient>;

    beforeEach(() => {
        mockMentorService = {
            getMentorById: jest.fn(),
        } as unknown as jest.Mocked<MentorService>;

        mockTimeSlotService = {
            getTimeSlotById: jest.fn(),
            markTimeslotAsBooked: jest.fn(),
        } as unknown as jest.Mocked<TimeSlotService>;

        mockBookingService = {
            createBooking: jest.fn(),
            isStudentHasOverlappingBookings: jest.fn(),
        } as unknown as jest.Mocked<BookingService>;

        mockStudentService = {
            getStudentById: jest.fn(),
        } as unknown as jest.Mocked<StudentService>;

        mockSQSClient = {
            send: jest.fn(),
        } as unknown as jest.Mocked<SQSClient>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mentor: MentorEntity = {
        id: "mentor-1",
        email: "mentor@example.com",
        fullName: "John Mentor",
        skills: ["JavaScript", "AWS", "React"],
        experience: 5,
    };

    const student: StudentEntity = {
        id: "student-1",
        email: "student@example.com",
        fullName: "Jane Student",
    };

    const timeslot: TimeSlotEntity = {
        id: "timeslot-1",
        mentorId: mentor.id,
        isBooked: false,
        startDate: new Date("2023-12-01T10:00:00Z"),
        endDate: new Date("2023-12-01T11:00:00Z"),
    };

    const booking: BookingEntity = {
        id: "booking-1",
        mentorId: mentor.id,
        studentId: student.id,
        timeslotId: timeslot.id,
        status: "confirmed",
    };

    test("handleCreateBooking should create booking successfully", async () => {
        const event = {
            body: JSON.stringify(booking), 
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(timeslot);
        mockStudentService.getStudentById.mockResolvedValueOnce(student);
        mockBookingService.isStudentHasOverlappingBookings.mockResolvedValueOnce(false);
        mockBookingService.createBooking.mockResolvedValueOnce(booking);
        mockTimeSlotService.markTimeslotAsBooked.mockResolvedValueOnce();

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 201,
            body: JSON.stringify({
                message: "Booking was successfully created",
                booking: JSON.stringify(booking),
            }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith(booking.mentorId);
        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith(booking.timeslotId);
        expect(mockStudentService.getStudentById).toHaveBeenCalledWith(booking.studentId);
        expect(mockBookingService.isStudentHasOverlappingBookings).toHaveBeenCalledWith(
            student.id,
            timeslot.startDate,
            timeslot.endDate
        );
        expect(mockBookingService.createBooking).toHaveBeenCalledWith(booking);
        expect(mockTimeSlotService.markTimeslotAsBooked).toHaveBeenCalledWith(timeslot);
    });

    test("handleCreateBooking should return error if mentor is invalid", async () => {
        const event = {
            body: JSON.stringify(booking),
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(null);

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid mentor",
            }),
        });
    });

    test("handleCreateBooking should return error if timeslot is invalid or booked", async () => {
        const event = {
            body: JSON.stringify(booking),
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce({
            ...timeslot,
            isBooked: true,
        });

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid timeslot",
            }),
        });
    });

    test("handleCreateBooking should return error if student is invalid", async () => {
        const event = {
            body: JSON.stringify(booking),
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(timeslot);
        mockStudentService.getStudentById.mockResolvedValueOnce(null);

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid student",
            }),
        });
    });

    test("handleCreateBooking should return error for overlapping student bookings", async () => {
        const event = {
            body: JSON.stringify(booking),
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getTimeSlotById.mockResolvedValueOnce(timeslot);
        mockStudentService.getStudentById.mockResolvedValueOnce(student);
        mockBookingService.isStudentHasOverlappingBookings.mockResolvedValueOnce(true);

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Conflicting booking found for the student during the requested timeslot.",
            }),
        });
    });

    test("handleCreateBooking should return 500 if an internal error occurs", async () => {
        const event = {
            body: JSON.stringify(booking),
        };

        mockMentorService.getMentorById.mockRejectedValueOnce(new Error("Unexpected Error"));

        const result = await handleCreateBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal Server Error",
            }),
        });
    });
});