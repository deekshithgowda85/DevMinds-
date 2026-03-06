# ═══════════════════════════════════════════════════════════════
# DevMind Test File — Intentional Bugs for Testing All Features
# ═══════════════════════════════════════════════════════════════
# 
# HOW TO USE:
# 1. Open this file in the DevMind editor (/editor page)
# 2. Click "Run" to execute — errors will appear in terminal
# 3. CodeTrace tab → Click "Debug" → AI analyzes the error
# 4. Explain tab  → Click "Explain" → AI explains each section
# 5. Practice tab → Click "Start Quiz" → AI generates quiz from your weak concepts
# 6. SmartDocs tab → Click "Generate" → AI creates learning report
#
# UNCOMMENT ONE BUG AT A TIME to test different error types.
# ═══════════════════════════════════════════════════════════════


# ──────────────────────────────────────────────────────────────
# BUG 1: NameError — Using variable before declaration
# Expected Error: NameError: name 'total' is not defined
# ──────────────────────────────────────────────────────────────

def calculate_average(numbers):
    for num in numbers:
        total += num          # BUG: 'total' never initialized
    return total / len(numbers)

scores = [85, 92, 78, 95, 88]
avg = calculate_average(scores)
print(f"Average score: {avg}")


# ──────────────────────────────────────────────────────────────
# BUG 2: IndexError — Off-by-one in loop
# Uncomment below and comment out Bug 1 to test
# ──────────────────────────────────────────────────────────────



# ──────────────────────────────────────────────────────────────
# BUG 3: TypeError — Wrong data type operations
# Uncomment below and comment out previous bugs to test
# ──────────────────────────────────────────────────────────────

def process_user_data(users):
    report = ""
    for user in users:
        age_next_year = user["age"] + "1"    # BUG: concatenating str to int
        report += f"{user['name']} will be {age_next_year}\n"
    return report

users = [
     {"name": "Alice", "age": 25},
     {"name": "Bob", "age": 30},
     {"name": "Charlie", "age": 22}
    ]
print(process_user_data(users))


# ──────────────────────────────────────────────────────────────
# BUG 4: Logic Error — Recursive function with wrong base case
# Uncomment below and comment out previous bugs to test
# ──────────────────────────────────────────────────────────────

# def factorial(n):
#     if n == 0:              # BUG: doesn't handle negative numbers
#         return 1
#     return n * factorial(n - 1)
#
# print(f"5! = {factorial(5)}")
# print(f"-3! = {factorial(-3)}")   # Infinite recursion!


# ──────────────────────────────────────────────────────────────
# BUG 5: AttributeError — Calling method on wrong type
# Uncomment below and comment out previous bugs to test
# ──────────────────────────────────────────────────────────────

# class Student:
#     def __init__(self, name, grades):
#         self.name = name
#         self.grades = grades
#
#     def get_highest(self):
#         return max(self.grades)
#
#     def get_average(self):
#         return sum(self.grades) / len(self.grades)
#
# students = [
#     Student("Alice", [90, 85, 92]),
#     Student("Bob", [78, 88, 95]),
#     None,                                    # BUG: None in the list
#     Student("Charlie", [70, 82, 88])
# ]
#
# for s in students:
#     print(f"{s.name}: avg={s.get_average():.1f}")  # Crashes on None
