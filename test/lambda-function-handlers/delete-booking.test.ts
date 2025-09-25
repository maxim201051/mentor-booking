import { MentorService } from "../../src/services/mentor-service";
import { BookingService } from "../../src/services/booking-service";
import { StudentService } from "../../src/services/student-service";
import { SQSClient } from "@aws-sdk/client-sqs";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { StudentEntity } from "../../src/entities/student-entity";
import { BookingEntity } from "../../src/entities/booking-entity";
import { TimeSlotService } from "../../src/services/timeslot-service";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { handleDeleteBooking } from "../../src/handlers/delete-booking";

jest.mock("@aws-sdk/client-sqs", () => ({
    SQSClient: jest.fn(() => ({
        send: jest.fn(),
    })),
    SendMessageCommand: jest.requireActual("@aws-sdk/client-sqs").SendMessageCommand,
}));

describe("handleDeleteBooking Tests", () => {
    let mockMentorService: MentorService;
    let mockTimeSlotService: TimeSlotService;
    let mockBookingService: BookingService;
    let mockStudentService: StudentService;
    let mockSQSClient: SQSClient;

    beforeEach(() => {
        mockMentorService = {
            getMentorById: jest.fn(),
        } as unknown as jest.Mocked<MentorService>;

        mockTimeSlotService = {
            getTimeSlotById: jest.fn(),
            markTimeslotAsNonBooked: jest.fn(),
        } as unknown as jest.Mocked<TimeSlotService>;

        mockBookingService = {
            getBookingById: jest.fn(),
            deleteBookingById: jest.fn(),
        } as unknown as jest.Mocked<BookingService>;

        mockStudentService = {
            getStudentById: jest.fn(),
        } as unknown as jest.Mocked<StudentService>;

        mockSQSClient = {
            send: jest.fn(),
        } as unknown as SQSClient;
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

    const timeSlot: TimeSlotEntity = {
        id: "timeslot-1",
        mentorId: "mentor-1",
        startDate: new Date("2025-12-01T10:00:00Z"),
        endDate: new Date("2025-12-01T11:00:00Z"),
        isBooked: true,
    };

    const booking: BookingEntity = {
        id: "booking-1",
        mentorId: "mentor-1",
        studentId: "student-1",
        timeslotId: "timeslot-1",
        status: "confirmed",
    };

    const eventWithValidData = {
        pathParameters: { bookingId: "booking-1" },
        headers: { auth: "student-1" },
    };

    test("handleDeleteBooking should delete booking successfully", async () => {
        (mockBookingService.getBookingById as jest.Mock).mockResolvedValueOnce(booking);
        (mockMentorService.getMentorById as jest.Mock).mockResolvedValueOnce(mentor);
        (mockTimeSlotService.getTimeSlotById as jest.Mock).mockResolvedValueOnce(timeSlot);
        (mockStudentService.getStudentById as jest.Mock).mockResolvedValueOnce(student);
        (mockBookingService.deleteBookingById as jest.Mock).mockResolvedValueOnce(undefined);
        (mockTimeSlotService.markTimeslotAsNonBooked as jest.Mock).mockResolvedValueOnce(undefined);

        const result = await handleDeleteBooking(eventWithValidData, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify({
                message: "Booking was successfully deleted",
            }),
        });

        expect(mockBookingService.getBookingById).toHaveBeenCalledWith("booking-1");
        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockTimeSlotService.getTimeSlotById).toHaveBeenCalledWith("timeslot-1");
        expect(mockStudentService.getStudentById).toHaveBeenCalledWith("student-1");
        expect(mockBookingService.deleteBookingById).toHaveBeenCalledWith("booking-1");
        expect(mockTimeSlotService.markTimeslotAsNonBooked).toHaveBeenCalledWith(timeSlot);
    });

    test("handleDeleteBooking should return error if 'bookingId' is missing", async () => {
        const event = { ...eventWithValidData, pathParameters: null };

        const result = await handleDeleteBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "bookingId is required in the path parameters",
            }),
        });
    });

    test("handleDeleteBooking should return error if 'auth' header is missing", async () => {
        const event = { ...eventWithValidData, headers: {} };

        const result = await handleDeleteBooking(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 401,
            body: JSON.stringify({ error: "auth header is required" }),
        });
    });

    test("handleDeleteBooking should return error if booking does not exist", async () => {
        (mockBookingService.getBookingById as jest.Mock).mockResolvedValueOnce(null);

        const result = await handleDeleteBooking(eventWithValidData, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Invalid booking",
            }),
        });
    });

    test("handleDeleteBooking should return error if student does not own booking", async () => {
        const wrongStudentBooking = { ...booking, studentId: "student-2" }; 
        (mockBookingService.getBookingById as jest.Mock).mockResolvedValueOnce(wrongStudentBooking);

        const result = await handleDeleteBooking(eventWithValidData, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 403,
            body: JSON.stringify({
                error: "Access denied. Cannot delete booking owned by another student",
            }),
        });
    });

    test("handleDeleteBooking should return 500 for unexpected errors", async () => {
        (mockBookingService.getBookingById as jest.Mock).mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleDeleteBooking(eventWithValidData, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });
    });
});