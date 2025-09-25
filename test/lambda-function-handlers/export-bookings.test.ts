import { BookingService } from "../../src/services/booking-service";
import { UploadService } from "../../src/services/upload-service";
import { SQSClient } from "@aws-sdk/client-sqs";
import { BookingEntity } from "../../src/entities/booking-entity";
import { handleExportBookings } from "../../src/handlers/export-bookings";

jest.mock("@aws-sdk/client-sqs", () => ({
    SQSClient: jest.fn(() => ({
        send: jest.fn(),
    })),
    SendMessageCommand: jest.requireActual("@aws-sdk/client-sqs").SendMessageCommand,
}));

describe("handleExportBookings Tests", () => {
    let mockBookingService: jest.Mocked<BookingService>;
    let mockUploadService: jest.Mocked<UploadService>;
    let mockSQSClient: jest.Mocked<SQSClient>;

    beforeEach(() => {
        mockBookingService = {
            getAllBookings: jest.fn(),
        } as unknown as jest.Mocked<BookingService>;

        mockUploadService = {
            uploadBookingsExport: jest.fn(),
        } as unknown as jest.Mocked<UploadService>;

        mockSQSClient = {
            send: jest.fn(),
        } as unknown as jest.Mocked<SQSClient>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const bookings: BookingEntity[] = [
        {
            id: "b1",
            mentorId: "m1",
            studentId: "s1",
            timeslotId: "t1",
            status: "confirmed",
        },
        {
            id: "b2",
            mentorId: "m2",
            studentId: "s2",
            timeslotId: "t2",
            status: "completed",
        },
    ];

    const eventWithValidTask = {
        Records: [
            {
                body: JSON.stringify({ task: "export_bookings" }),
            },
        ],
    };

    const eventWithInvalidTask = {
        Records: [
            {
                body: JSON.stringify({ task: "unexpected_task" }),
            },
        ],
    };

    test("handleExportBookings should process export_bookings task and send success event", async () => {
        const downloadUrl = "https://example.com/bookings.csv";

        mockBookingService.getAllBookings.mockResolvedValueOnce(bookings);
        mockUploadService.uploadBookingsExport.mockResolvedValueOnce(downloadUrl);

        const result = await handleExportBookings(eventWithValidTask, {
            bookingService: mockBookingService,
            uploadService: mockUploadService,
            sqsClient: mockSQSClient,
        });

        expect(result).toEqual({ message: "Bookings export events processed" });
        expect(mockBookingService.getAllBookings).toHaveBeenCalled();
        expect(mockUploadService.uploadBookingsExport).toHaveBeenCalledWith(bookings);
        expect(mockSQSClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    MessageBody: JSON.stringify({
                        type: "bookings.exported",
                        exportStatus: "success",
                        recordCount: bookings.length,
                        downloadUrl,
                    }),
                },
            })
        );
    });

    test("handleExportBookings should return a message for unexpected task types", async () => {
        const result = await handleExportBookings(eventWithInvalidTask, {
            bookingService: mockBookingService,
            uploadService: mockUploadService,
            sqsClient: mockSQSClient,
        });

        expect(result).toEqual({ message: "Unexpected event type" });
        expect(mockBookingService.getAllBookings).not.toHaveBeenCalled();
        expect(mockUploadService.uploadBookingsExport).not.toHaveBeenCalled();
        expect(mockSQSClient.send).not.toHaveBeenCalled();
    });

    test("handleExportBookings should send failure event if an error occurs", async () => {
        mockBookingService.getAllBookings.mockRejectedValueOnce(new Error("Simulated error"));

        await expect(
            handleExportBookings(eventWithValidTask, {
                bookingService: mockBookingService,
                uploadService: mockUploadService,
                sqsClient: mockSQSClient,
            })
        ).rejects.toThrow("Simulated error");

        expect(mockSQSClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
                input: {
                    MessageBody: JSON.stringify({
                        type: "bookings.exported",
                        exportStatus: "failed",
                        recordCount: 0,
                        downloadUrl: "",
                    }),
                },
            })
        );
    });
});