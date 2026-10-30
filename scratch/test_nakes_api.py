import urllib.request
import json

base_url = "http://127.0.0.1:5000/api/admin/nakes"

# 1. GET
req = urllib.request.urlopen(base_url)
data = json.loads(req.read().decode("utf-8"))
print("INITIAL COUNT:", data["total"])

# 2. POST NAKES BARU
new_nakes = {
    "name": "dr. Rian Pratama, Sp.N",
    "profession": "Dokter Spesialis Neurologi (Sp.N)",
    "str_number": "35.1.1.100.1.22.998877",
    "sip_number": "503/SIP.DS/077/Dinkes/2024",
    "institution": "RSUD Dr. Soetomo Surabaya",
    "phone": "081234567899",
    "real_email": "rian.pratama99@gmail.com",
    "nakes_email": "rian.pratama@neura.ns.id",
    "status": "Terverifikasi KKI"
}
req2 = urllib.request.Request(
    base_url,
    data=json.dumps(new_nakes).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res2 = urllib.request.urlopen(req2)
created = json.loads(res2.read().decode("utf-8"))
nakes_id = created["data"]["id"]
print("CREATED SUCCESS:", created["success"], nakes_id, created["data"]["nakes_email"])

# 3. GET LAGI
req3 = urllib.request.urlopen(base_url)
data3 = json.loads(req3.read().decode("utf-8"))
print("NEW COUNT:", data3["total"])

# 4. DELETE
del_req = urllib.request.Request(f"{base_url}/{nakes_id}", method="DELETE")
res4 = urllib.request.urlopen(del_req)
deleted = json.loads(res4.read().decode("utf-8"))
print("DELETED SUCCESS:", deleted["success"])
