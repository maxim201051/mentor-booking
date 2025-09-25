import { StudentService } from "../../src/services/student-service";
import { BookingService } from "../../src/services/booking-service";
import { StudentEntity } from "../../src/entities/student-entity";
import { BookingEntity } from "../../src/entities/booking-entity";
import { handleGetBookingsByStudent } from "../../src/handlers/get-bookings-by-student";

describe("handleGetBookingsByStudent Tests", () => {
    let mockStudentService: jest.Mocked<StudentService>;
    let mockBookingService: jest.Mocked<BookingService>;

    beforeEach(() => {
        mockStudentService = {
            getStudentById: jest.fn(),
        } as unknown as jest.Mocked<StudentService>;

        mockBookingService = {
            getBookingsByStudentIdWithFilters: jest.fn(),
        } as unknown as jest.Mocked<BookingService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const student: StudentEntity = {
        id: "student-1",
        email: "student@example.com",
        fullName: "Jane Student",
    };

    const bookings: BookingEntity[] = [
        {
            id: "booking-1",
            mentorId: "mentor-1",
            studentId: "student-1",
            timeslotId: "timeslot-1",
            status: "confirmed",
        },
        {
            id: "booking-2",
            mentorId: "mentor-2",
            studentId: "student-1",
            timeslotId: "timeslot-2",
            status: "completed",
        },
    ];

    const eventWithValidAuthHeader = {
        headers: { auth: "student-1" },
        queryStringParameters: { type: "past" },
    };

    test("handleGetBookingsByStudent should return filtered bookings for a valid student", async () => {
        mockStudentService.getStudentById.mockResolvedValueOnce(student);
        mockBookingService.getBookingsByStudentIdWithFilters.mockResolvedValueOnce(bookings);

        const result = await handleGetBookingsByStudent(eventWithValidAuthHeader, {
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify(bookings),
        });

        expect(mockStudentService.getStudentById).toHaveBeenCalledWith("student-1");
        expect(mockBookingService.getBookingsByStudentIdWithFilters).toHaveBeenCalledWith(
            "student-1",
            { type: "past" }
        );
    });

    test("handleGetBookingsByStudent should return error if 'auth' header is missing", async () => {
        const event = { ...eventWithValidAuthHeader, headers: {} }; 

        const result = await handleGetBookingsByStudent(event, {
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 401,
            body: JSON.stringify({
                error: "auth header is required",
            }),
        });

        expect(mockStudentService.getStudentById).not.toHaveBeenCalled();
        expect(mockBookingService.getBookingsByStudentIdWithFilters).not.toHaveBeenCalled();
    });

    test("handleGetBookingsByStudent should return error if student does not exist", async () => {
        mockStudentService.getStudentById.mockResolvedValueOnce(null);

        const result = await handleGetBookingsByStudent(eventWithValidAuthHeader, {
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Student with such id does not exits",
            }),
        });

        expect(mockStudentService.getStudentById).toHaveBeenCalledWith("student-1");
        expect(mockBookingService.getBookingsByStudentIdWithFilters).not.toHaveBeenCalled();
    });

    test("handleGetBookingsByStudent should return 500 for unexpected errors", async () => {
        mockStudentService.getStudentById.mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleGetBookingsByStudent(eventWithValidAuthHeader, {
            studentService: mockStudentService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockStudentService.getStudentById).toHaveBeenCalledWith("student-1");
        expect(mockBookingService.getBookingsByStudentIdWithFilters).not.toHaveBeenCalled();
    });
});