import EventKit
import Foundation

let store = EKEventStore()
let semaphore = DispatchSemaphore(value: 0)
let args = CommandLine.arguments

func requestAccess(_ completion: @escaping (Bool) -> Void) {
    if #available(macOS 14.0, *) {
        store.requestFullAccessToReminders { granted, _ in completion(granted) }
    } else {
        store.requestAccess(to: .reminder) { granted, _ in completion(granted) }
    }
}

let command = args.count > 1 ? args[1] : "list"

switch command {
case "list":
    requestAccess { granted in
        guard granted else { print("[]"); semaphore.signal(); return }
        let predicate = store.predicateForIncompleteReminders(
            withDueDateStarting: nil, ending: nil, calendars: nil
        )
        store.fetchReminders(matching: predicate) { reminders in
            let items = (reminders ?? []).compactMap { r -> [String: String]? in
                guard let title = r.title, !title.isEmpty else { return nil }
                return ["id": r.calendarItemIdentifier, "title": title]
            }
            if let data = try? JSONSerialization.data(withJSONObject: items),
               let json = String(data: data, encoding: .utf8) {
                print(json)
            } else {
                print("[]")
            }
            semaphore.signal()
        }
    }

case "complete":
    guard args.count > 2 else {
        fputs("error: missing id\n", stderr)
        exit(1)
    }
    let id = args[2]
    requestAccess { granted in
        guard granted else { fputs("error: access denied\n", stderr); semaphore.signal(); return }
        guard let reminder = store.calendarItem(withIdentifier: id) as? EKReminder else {
            fputs("error: reminder not found\n", stderr)
            semaphore.signal()
            return
        }
        reminder.isCompleted = true
        do {
            try store.save(reminder, commit: true)
            print("ok")
        } catch {
            fputs("error: \(error.localizedDescription)\n", stderr)
        }
        semaphore.signal()
    }

case "create":
    guard args.count > 2 else {
        fputs("error: missing title\n", stderr)
        exit(1)
    }
    let title = args[2]
    requestAccess { granted in
        guard granted else { fputs("error: access denied\n", stderr); semaphore.signal(); return }
        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        reminder.calendar = store.defaultCalendarForNewReminders()
        do {
            try store.save(reminder, commit: true)
            print("ok")
        } catch {
            fputs("error: \(error.localizedDescription)\n", stderr)
        }
        semaphore.signal()
    }

default:
    fputs("error: unknown command \(command)\n", stderr)
    exit(1)
}

semaphore.wait()
