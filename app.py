from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import re
import os

app = Flask(__name__)
CORS(app)

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
        with open(file_path, "r", errors="ignore") as f:
            content = f.read()

        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return True

        return False

    except:
        return False


@app.route("/scan", methods=["POST"])
def scan():

    file = request.files["file"]

    temp_path = "temp_" + file.filename

    file.save(temp_path)

    scan_result = scan_for_virus(temp_path)

    secret_found = check_for_secrets(temp_path)

    os.remove(temp_path)

    if "FOUND" in scan_result:

        return jsonify({
            "status":"BLOCKED",
            "reason":"Virus Detected"
        })

    elif secret_found:

        return jsonify({
            "status":"BLOCKED",
            "reason":"Secret Detected"
        })

    else:

        return jsonify({
            "status":"PASS",
            "reason":"Clean"
        })


if __name__=="__main__":
    app.run(debug=True)