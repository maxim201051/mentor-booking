import { handleNotifyAboutImportExport } from "../../src/handlers/notify-about-import-export";
import { DefaultNotificationService } from "../../src/services/default-notification-service";

describe("handleNotifyAboutImportExport Tests", () => {
    let mockDefaultNotificationService: jest.Mocked<DefaultNotificationService>;

    beforeEach(() => {
        mockDefaultNotificationService = {
            notifyAboutImportExport: jest.fn(), 
        } as unknown as jest.Mocked<DefaultNotificationService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const eventWithMentorsImported = {
        Records: [
            {
                body: JSON.stringify({
                    type: "mentors.imported",
                    total: 100,
                    success: 95,
                    failed: 5,
                }),
            },
        ],
    };

    const eventWithBookingsExported = {
        Records: [
            {
                body: JSON.stringify({
                    type: "bookings.exported",
                    exportStatus: "COMPLETED",
                    recordCount: 200,
                    downloadUrl: "https://example.com/bookings.csv",
                }),
            },
        ],
    };

    const eventWithUnexpectedType = {
        Records: [
            {
                body: JSON.stringify({
                    type: "unexpected.event",
                }),
            },
        ],
    };

    const malformedEvent = {
        Records: [
            {
                body: "invalid json string", 
            },
        ],
    };

    test("handleNotifyAboutImportExport should process mentors.imported and send notification successfully", async () => {
        mockDefaultNotificationService.notifyAboutImportExport.mockResolvedValueOnce();

        const result = await handleNotifyAboutImportExport(eventWithMentorsImported, {
            defaultNotificationService: mockDefaultNotificationService,
        });

        expect(result).toEqual({ message: "Notifications processed" });

        expect(mockDefaultNotificationService.notifyAboutImportExport).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "mentors.imported",
                total: 100,
                success: 95,
                failed: 5,
            })
        );
    });

    test("handleNotifyAboutImportExport should process bookings.exported and send notification successfully", async () => {
        mockDefaultNotificationService.notifyAboutImportExport.mockResolvedValueOnce();

        const result = await handleNotifyAboutImportExport(eventWithBookingsExported, {
            defaultNotificationService: mockDefaultNotificationService,
        });

        expect(result).toEqual({ message: "Notifications processed" });

        expect(mockDefaultNotificationService.notifyAboutImportExport).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "bookings.exported",
                exportStatus: "COMPLETED",
                recordCount: 200,
                downloadUrl: "https://example.com/bookings.csv",
            })
        );
    });

    test("handleNotifyAboutImportExport should skip processing for unexpected event types", async () => {
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

        const result = await handleNotifyAboutImportExport(eventWithUnexpectedType, {
            defaultNotificationService: mockDefaultNotificationService,
        });

        expect(result).toEqual({ message: "Unexpected event type" });

        expect(consoleSpy).toHaveBeenCalledWith("Unexpected event type: unexpected.event");

        expect(mockDefaultNotificationService.notifyAboutImportExport).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test("handleNotifyAboutImportExport should throw an error for malformed JSON records", async () => {
        await expect(
            handleNotifyAboutImportExport(malformedEvent, {
                defaultNotificationService: mockDefaultNotificationService,
            })
        ).rejects.toThrow(SyntaxError);

        expect(mockDefaultNotificationService.notifyAboutImportExport).not.toHaveBeenCalled();
    });

    test("handleNotifyAboutImportExport should throw an error if notifyAboutImportExport fails", async () => {
        const event = { ...eventWithMentorsImported };
        const simulatedError = new Error("Notification sending failed");

        mockDefaultNotificationService.notifyAboutImportExport.mockRejectedValueOnce(simulatedError);

        await expect(
            handleNotifyAboutImportExport(event, {
                defaultNotificationService: mockDefaultNotificationService,
            })
        ).rejects.toThrow(simulatedError);

        expect(mockDefaultNotificationService.notifyAboutImportExport).toHaveBeenCalledWith(
            expect.objectContaining({ type: "mentors.imported" })
        );
    });
});