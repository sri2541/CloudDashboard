import re
import subprocess

CLAMSCAN_PATH = r"C:\Program Files\ClamAV\clamscan.exe"


def scan_for_virus(file_path):
    try:
        result = subprocess.run(
            [CLAMSCAN_PATH, file_path],
            capture_output=True,
            text=True
        )
        return result.stdout
    except Exception as e:
        return str(e)


def check_for_secrets(file_path):
    patterns = [
        r"password\s*=",
        r"passwd\s*=",
        r"secret\s*=",
        r"AKIA[0-9A-Z]{16}"
    ]

    try:
        with open(file_path, "r", errors="ignore") as file:
            content = file.read()

        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True

        return False

    except Exception:
        return False


file_path = input("Enter the full path of the file to scan: ")

scan_result = scan_for_virus(file_path)

print("\n===== VIRUS SCAN RESULT =====")
print(scan_result)

secret_found = check_for_secrets(file_path)

if "FOUND" in scan_result:
    print("\n❌ BLOCKED - Virus detected")
elif secret_found:
    print("\n❌ BLOCKED - Secret/Password detected")
else:
    print("\n✅ PASS - File is safe")