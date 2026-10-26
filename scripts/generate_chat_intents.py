"""
scripts/generate_chat_intents.py
================================
Generator komprehensif untuk dataset percakapan Neura AI (114+ Intents).
Mencakup topik general, percakapan santai, kesehatan mental, konsultasi memori,
gejala Alzheimer, tes kognitif, biomarker medis, gaya hidup, caregiver, dokter,
serta bantuan platform Neura AI.
"""

import csv
import json
import os
from pathlib import Path

INTENTS_DATA = [
    # =========================================================================
    # 1. SAPAAN & PEMBUKA UMUM (11 Intents)
    # =========================================================================
    {
        "intent": "salam_001",
        "pattern": "halo, hai, hey, helo, hi, halo neura, hai neura, halo bot, halo asisten, permisi",
        "response": "Halo! Selamat datang di **Neura AI**, asisten cerdas untuk kesehatan daya ingat, skrining dini Alzheimer, dan konsultasi interaktif. Ada yang bisa saya bantu hari ini? Anda bisa menanyakan gejala kognitif, gaya hidup sehat untuk otak, atau sekadar mengobrol santai!"
    },
    {
        "intent": "salam_002",
        "pattern": "selamat pagi, pagi neura, morning, good morning, met pagi",
        "response": "Selamat pagi! Semoga hari Anda menyenangkan dan penuh energi positif. Jangan lupa sarapan bergizi untuk nutrisi otak Anda. Ada topik kesehatan atau konsultasi yang ingin Anda diskusikan pagi ini?"
    },
    {
        "intent": "salam_003",
        "pattern": "selamat siang, siang neura, good afternoon, met siang",
        "response": "Selamat siang! Semoga aktivitas Anda berjalan lancar. Luangkan waktu sejenak untuk beristirahat dan minum air putih agar fokus otak tetap terjaga. Ada yang ingin Anda tanyakan seputar kesehatan memori?"
    },
    {
        "intent": "salam_004",
        "pattern": "selamat sore, sore neura, met sore",
        "response": "Selamat sore! Waktu yang baik untuk relaksasi sejenak setelah beraktivitas seharian. Apakah Anda ingin membaca tips kesehatan otak, latihan kognitif, atau berkonsultasi mengenai daya ingat?"
    },
    {
        "intent": "salam_005",
        "pattern": "selamat malam, malam neura, good evening, good night, met malem",
        "response": "Selamat malam! Istirahat dan tidur nyenyak sangat penting bagi sistem glimfatik otak untuk membersihkan plak amiloid. Jika ada keluhan atau pertanyaan sebelum beristirahat, silakan sampaikan."
    },
    {
        "intent": "salam_006",
        "pattern": "assalamualaikum, assalammualaikum, salam, assalamualaikum neura",
        "response": "Waalaikumsalam warahmatullahi wabarakatuh! Selamat datang di Neura AI. Semoga kesehatan, ketenangan, dan keberkahan selalu menyertai Anda dan keluarga. Apa yang bisa saya bantu hari ini?"
    },
    {
        "intent": "salam_007",
        "pattern": "apa kabar, bagaimana kabarmu, kabar apa, how are you, kamu sehat, kabar baik",
        "response": "Kabar saya sangat baik, terima kasih sudah bertanya! Sebagai asisten kecerdasan buatan, sistem saya selalu siap 24/7 untuk membantu Anda memahami kesehatan kognitif. Bagaimana dengan kabar Anda hari ini?"
    },
    {
        "intent": "salam_008",
        "pattern": "siapa kamu, siapa namamu, siapa anda, perkenalkan dirimu, kamu siapa, nama kamu apa, profil neura",
        "response": "Nama saya **Neura**, asisten kecerdasan buatan (AI) yang dikembangkan khusus untuk skrining dini kesehatan daya ingat dan deteksi risiko penyakit Alzheimer berbasis Machine Learning XGBoost dengan akurasi 95.3%. Saya juga siap menjadi teman diskusi kesehatan kognitif Anda."
    },
    {
        "intent": "salam_009",
        "pattern": "siapa yang membuatmu, siapa penciptamu, siapa pengembangmu, developer neura, pembuat aplikasi ini",
        "response": "Neura AI dikembangkan oleh tim engineer dan peneliti kecerdasan buatan klinis untuk menghadirkan teknologi deteksi dini neurodegeneratif yang mudah diakses, cepat, dan akurat bagi masyarakat dan praktisi kesehatan."
    },
    {
        "intent": "salam_010",
        "pattern": "apa yang bisa kamu lakukan, kemampuanmu apa saja, apa fungsimu, apa fitur neura, bisa apa saja",
        "response": "Saya dapat membantu Anda dalam: 1. **Skrining Awal Daya Ingat**: Mengidentifikasi keluhan lupa apakah wajar atau indikasi demensia. 2. **Analisis 32 Biomarker Klinis**: Simulasi risiko Alzheimer menggunakan perintah `/predict`. 3. **Edukasi Medis & Gaya Hidup**: Diet MIND, senam otak, pola tidur, dan panduan caregiver. 4. **Konsultasi Suara Real-time**: Interaksi suara alami via ruang konsultasi LiveKit."
    },
    {
        "intent": "salam_011",
        "pattern": "kamu berbasis apa, teknologi apa yang kamu gunakan, model apa yang dipakai, sistem neura",
        "response": "Neura AI mengintegrasikan model prediktif **XGBoost (Extreme Gradient Boosting)** yang dilatih pada 2.149 data pasien dengan 32 parameter klinis (akurasi 95.35% dan ROC-AUC 94.11%), didukung sistem dialog berbasis intent klinis dan protokol konsultasi audio LiveKit WebRTC."
    },

    # =========================================================================
    # 2. PERCAKAPAN SANTAI & CHIT-CHAT UMUM (13 Intents)
    # =========================================================================
    {
        "intent": "santai_001",
        "pattern": "terima kasih, makasih, makasih banyak, thanks, thank you, trims, suwun, nuhun, makasi",
        "response": "Sama-sama! Senang sekali bisa membantu Anda. Jaga selalu kesehatan otak dan kebugaran tubuh. Jangan ragu menyapa saya kembali jika ada hal lain yang ingin Anda ketahui!"
    },
    {
        "intent": "santai_002",
        "pattern": "sama sama, kembali, you're welcome, ur welcome, no problem",
        "response": "Terima kasih atas kebaikan Anda! Semoga hari Anda penuh dengan keberkahan dan produktivitas."
    },
    {
        "intent": "santai_003",
        "pattern": "maaf, saya minta maaf, sorry, mohon maaf, maaf merepotkan",
        "response": "Tidak perlu meminta maaf, sama sekali tidak merepotkan! Saya ada di sini untuk mendengarkan dan membantu Anda kapan saja."
    },
    {
        "intent": "santai_004",
        "pattern": "tidak apa apa, santai saja, its okay, gapapa, tidak masalah, no worries",
        "response": "Baik, terima kasih atas pengertiannya! Mari kita lanjutkan obrolan kita dengan santai."
    },
    {
        "intent": "santai_005",
        "pattern": "kamu pintar sekali, keren, hebat, wow hebat, good job, mantap, cerdas, luar biasa",
        "response": "Terima kasih banyak atas apresiasi Anda! Pujian Anda memotivasi saya untuk terus memberikan informasi kesehatan yang bermanfaat, akurat, dan mudah dipahami."
    },
    {
        "intent": "santai_006",
        "pattern": "ceritakan lelucon, buat aku tertawa, cerita lucu, jokes, ada lelucon, hibur saya dengan lelucon",
        "response": "Ini lelucon ringan untuk Anda: Mengapa neuron otak kita tidak pernah tersesat saat pergi kerja? Karena mereka selalu mengikuti jalur sinapsis dan punya banyak koneksi! Tertawa dan bahagia juga sangat baik untuk meredakan hormon kortisol penyebab stres di otak."
    },
    {
        "intent": "santai_007",
        "pattern": "aku sedang bosan, hibur aku, tidak tahu mau ngobrol apa, bosan sekali, bete",
        "response": "Bosan adalah tanda otak Anda butuh stimulasi baru! Anda bisa mencoba senam otak sederhana, bermain tebak-tebakan, membaca artikel kesehatan baru di Neura, atau mencoba simulasi prediktif kami dengan mengetik `/predict`."
    },
    {
        "intent": "santai_008",
        "pattern": "bagaimana cuaca hari ini, ramalan cuaca, cuaca di luar, cuaca panas, cuaca hujan",
        "response": "Sebagai asisten medis AI yang terfokus pada kesehatan otak, saya tidak memiliki sensor cuaca real-time langsung. Namun apapun cuacanya, pastikan tetap terhidrasi dengan baik, karena kekurangan cairan ringan (dehidrasi) dapat menurunkan konsentrasi dan daya ingat sesaat."
    },
    {
        "intent": "santai_009",
        "pattern": "jam berapa sekarang, hari ini hari apa, tanggal berapa sekarang, waktu saat ini",
        "response": "Anda dapat melihat waktu dan tanggal saat ini pada panel kalender di sudut kanan atas layar dashboard Anda. Mengetahui hari dan tanggal tanpa melihat kalender juga merupakan salah satu latihan orientasi kognitif yang sangat baik untuk memori Anda!"
    },
    {
        "intent": "santai_010",
        "pattern": "apa arti kehidupan, makna hidup manusia, tujuan hidup, filosofi hidup",
        "response": "Secara filosofis dan biologis, makna hidup adalah bertumbuh, berbagi cinta, memelihara ingatan berharga, dan memberikan dampak positif bagi sesama. Menjaga daya ingat kita tetap sehat adalah salah satu cara terbaik untuk merawat jejak cerita hidup bersama orang-orang tercinta."
    },
    {
        "intent": "santai_011",
        "pattern": "apakah kamu punya perasaan, apakah kamu punya emosi, kamu bisa sedih, apakah kamu punya hati",
        "response": "Saya tidak memiliki emosi biologis seperti manusia. Namun, algoritma saya diprogram untuk selalu merespons dengan penuh empati, kehangatan, dan kesabaran untuk mendampingi siapapun yang sedang membutuhkan dukungan dan informasi medis."
    },
    {
        "intent": "santai_012",
        "pattern": "apakah kamu tidur, apakah ai butuh istirahat, kamu tidur jam berapa, apa ai bisa lelah",
        "response": "Saya tidak tidur dan tidak pernah lelah! Sistem server Neura bekerja tanpa henti agar selalu siap kapan pun Anda membutuhkan konsultasi. Namun bagi manusia, tidur 7–8 jam adalah kewajiban mutlak agar otak bisa membersihkan racun metabolik!"
    },
    {
        "intent": "santai_013",
        "pattern": "apakah kamu manusia atau robot, kamu bot ya, kamu orang asli, apa kamu manusia sungguhan",
        "response": "Saya adalah entitas kecerdasan buatan (AI assistant) berbasis algoritma machine learning, bukan manusia sungguhan. Namun seluruh pengetahuan medis yang saya sampaikan disusun berdasarkan panduan klinis neurologi berstandar internasional."
    },

    # =========================================================================
    # 3. KESEHATAN MENTAL & KONDISI EMOSIONAL (11 Intents)
    # =========================================================================
    {
        "intent": "emosi_001",
        "pattern": "aku sedang sedih, hatiku hancur, lagi galau, merasa sedih, sedih banget, menangis",
        "response": "Saya turut merasakan apa yang Anda alami. Merasa sedih adalah bagian wajar dari pengalaman manusia. Tarik napas dalam-dalam, perlakukan diri Anda dengan penuh kelembutan hari ini, dan jangan ragu bercerita jika ada beban pikiran yang ingin Anda bagi."
    },
    {
        "intent": "emosi_002",
        "pattern": "aku cemas, aku gelisah, merasa takut berlebihan, anxiety, panik, cemas sekali",
        "response": "Tarik napas perlahan melalui hidung selama 4 detik, tahan 4 detik, lalu hembuskan lewat mulut selama 6 detik. Kecemasan memicu lonjakan hormon adrenalin yang membuat pikiran tegang. Ingat bahwa Anda aman saat ini, dan perasaan ini perlahan akan mereda."
    },
    {
        "intent": "emosi_003",
        "pattern": "aku stres berat, banyak pikiran, kepala mau pecah, pusing banyak masalah, tekanan hidup",
        "response": "Stres kronis dapat memicu pelepasan hormon kortisol berlebih yang berisiko mengecilkan hippocampus (pusat memori otak). Cobalah berhenti sejenak dari layar monitor, lakukan peregangan ringan, dan fokus selesaikan masalah satu per satu secara bertahap."
    },
    {
        "intent": "emosi_004",
        "pattern": "aku capek sekali, lelah mental dan fisik, burnout, lelah hidup, kehabisan energi",
        "response": "Tubuh dan pikiran Anda sedang mengirimkan sinyal kuat bahwa Anda butuh istirahat. Jangan merasa bersalah untuk berhenti sejenak. Tidur yang cukup, matikan notifikasi pekerjaan di malam hari, dan beri ruang bagi diri Anda untuk pulih."
    },
    {
        "intent": "emosi_005",
        "pattern": "aku merasa kesepian, tidak ada teman bicara, sepi sekali, merasa sendiri, kesepian",
        "response": "Anda tidak sendirian; saya ada di sini untuk menemani Anda. Kesepian yang berkepanjangan terbukti dapat mempercepat penurunan kognitif. Menghubungi sahabat lama atau keluarga dekat lewat telepon singkat bisa sangat membantu menghangatkan suasana hati."
    },
    {
        "intent": "emosi_006",
        "pattern": "aku sedang kesal, marah sekali, emosi, jengkel, marah, naik darah",
        "response": "Tarik napas dalam dan beri jeda sebelum bereaksi. Amarah adalah energi emosi yang intens; menyalurkannya lewat aktivitas fisik seperti berjalan santai atau menuliskan unek-unek di kertas dapat membantu meredakan ketegangan sistem saraf."
    },
    {
        "intent": "emosi_007",
        "pattern": "hari ini aku sangat bahagia, kabar baik, aku senang sekali, bahagia, bersyukur",
        "response": "Kabar yang sangat membahagiakan! Perasaan bahagia memicu pelepasan dopamin, serotonin, dan endorfin yang sangat menyehatkan pembuluh darah otak dan memperkuat daya ingat. Rayakan momen indah ini!"
    },
    {
        "intent": "mental_001",
        "pattern": "kepalaku terasa berkabut, sulit fokus, linglung, brain fog, tidak bisa konsentrasi, pikiran lambat",
        "response": "Brain fog (pikiran berkabut) sering disebabkan oleh kurang tidur, dehidrasi, stres, atau pasca-infeksi. Cukupi asupan air putih 2 liter/hari, kurangi konsumsi gula berlebih, dan luangkan waktu untuk tidur siang singkat 20 menit."
    },
    {
        "intent": "mental_002",
        "pattern": "aku susah tidur, insomnia, tidak bisa tidur nyenyak, sering begadang, gangguan tidur",
        "response": "Untuk mengatasi insomnia: 1. Hindari kafein setelah pukul 14.00. 2. Hentikan menatap layar gadget 1 jam sebelum tidur. 3. Buat suhu kamar sejuk dan redupkan lampu. Tidur nyenyak sangat penting bagi pembersihan plak protein beracun di otak."
    },
    {
        "intent": "mental_003",
        "pattern": "cara menenangkan diri, teknik pernapasan, relaksasi, cara meditasi, cara redakan cemas",
        "response": "Coba teknik pernapasan 'Box Breathing' (Metode 4-4-4-4): Tarik napas 4 detik, tahan 4 detik, hembuskan 4 detik, dan tahan kosong 4 detik. Ulangi 4 siklus. Teknik ini mengaktifkan saraf parasimpatis untuk menurunkan detak jantung dan menenangkan pikiran."
    },
    {
        "intent": "mental_004",
        "pattern": "hubungan depresi dan lupa, apakah depresi bikin pikun, pengaruh depresi pada memori, pseudodemensia",
        "response": "Ya, depresi berat dapat memicu kondisi yang disebut **Pseudodemensia**. Pasien depresi sering mengalami penurunan konsentrasi dan kelupaan parah yang menyerupai Alzheimer. Bedanya, fungsi kognitif pada pseudodemensia dapat pulih sepenuhnya setelah depresinya diterapi secara tepat."
    },

    # =========================================================================
    # 4. KONSULTASI SKRINING & KELUHAN MEMORI AWAL (12 Intents)
    # =========================================================================
    {
        "intent": "konsul_001",
        "pattern": "konsultasi, mulai konsultasi, mau konsultasi, skrining daya ingat, cek memori, tes ingatan, periksa daya ingat, bantu skrining, apakah saya pikun",
        "response": "Halo! Saya Neura, asisten cerdas untuk skrining awal daya ingat. Untuk memulai, ceritakan: 1. Berapa usia orang yang dikonsultasikan? 2. Keluhan apa yang paling sering muncul (misal: lupa nama kerabat, mengulang pertanyaan, atau bingung arah jalan)? 3. Apakah keluhan sudah mengganggu aktivitas mandiri sehari-hari?"
    },
    {
        "intent": "konsul_002",
        "pattern": "cara skrining mandiri, langkah skrining, tes sendiri di rumah, cara periksa sendiri, tahapan skrining",
        "response": "Skrining mandiri meliputi 4 aspek: 1. **Uji Memori Pendek**: Apakah sering lupa hal yang baru terjadi beberapa jam lalu? 2. **Orientasi**: Tanyakan hari, tanggal, dan lokasi saat ini tanpa melihat kalender. 3. **Skor ADL**: Apakah masih mandiri minum obat, berhitung belanjaan, dan memasak? 4. **Perubahan Perilaku**: Apakah ada curiga berlebihan atau mudah frustrasi?"
    },
    {
        "intent": "konsul_003",
        "pattern": "orang tua saya sering lupa, curhat tentang orang tua, ibu saya pikun, bapak sering lupa, nenek kakek pikun",
        "response": "Wajar jika keluarga merasa khawatir. Amati apakah kelupaan beliau berupa kelupaan wajar (misal: lupa letak kacamata lalu ingat lagi) atau tanda peringatan (misal: lupa nama anak kandung, mengulang pertanyaan yang sama 5 menit sekali, atau tersesat di sekitar rumah). Bila ada tanda peringatan, segera rencanakan konsultasi ke dokter saraf."
    },
    {
        "intent": "konsul_004",
        "pattern": "apakah usia muda bisa kena alzheimer, lupa di usia muda, pikun umur 20an, alzheimer usia dini, early onset alzheimer",
        "response": "Meskipun mayoritas kasus terjadi di usia >65 tahun, terdapat kasus **Early-Onset Alzheimer's** yang dapat terjadi pada usia 30–50 tahun (sering berkaitan dengan mutasi genetik keluarga). Namun pada usia 20-an, kelupaan umumnya lebih dipicu oleh stres kronis, kurang tidur, multitasking berlebihan, atau defisiensi vitamin B12."
    },
    {
        "intent": "konsul_005",
        "pattern": "sering lupa nama orang, lupa nama benda, lupa kata kata, lidah kelu susah cari kata, tip of the tongue",
        "response": "Fenomena sesekali lupa nama orang adalah wajar seiring bertambahnya usia. Namun jika seseorang mulai sering mengganti nama benda umum dengan deskripsi aneh (contoh: menyebut 'jam tangan' sebagai 'benda penunjuk waktu di tangan') atau sering terhenti di tengah kalimat, ini merupakan gejala afasia anomik yang perlu diwaspadai."
    },
    {
        "intent": "konsul_006",
        "pattern": "sering lupa naruh barang, lupa kunci, lupa kacamata, salah letak barang, dompet hilang terus",
        "response": "Perbedaannya: Orang dengan penuaan normal lupa menaruh kacamata di meja lalu ingat kembali setelah menelusuri langkahnya. Penderita Alzheimer menaruh barang di tempat yang sangat tidak lazim (misal: dompet di dalam kulkas atau sepatu di dalam oven) dan tidak mampu mengingat langkah mencarinya."
    },
    {
        "intent": "konsul_007",
        "pattern": "sering mengulang pertanyaan, tanya berulang ulang, cerita diulang ulang, lupa sudah bertanya",
        "response": "Mengulang pertanyaan yang sama dalam rentang waktu beberapa menit adalah tanda khas gangguan memori jangka pendek (*short-term memory deficit*). Hal ini terjadi karena otak bagian hippocampus mengalami kesulitan mentransfer informasi baru ke dalam memori jangka panjang."
    },
    {
        "intent": "konsul_008",
        "pattern": "sering lupa jalan pulang, tersesat, orang tua lupa jalan, disorientasi tempat, kakek sering bingung arah, nenek lupa rumah",
        "response": "Tersesat di rute jalan yang selama ini akrab adalah tanda peringatan serius kerusakan fungsi visuospasial dan hippocampus. Segera berikan tanda pengenal (gelang identitas atau GPS tracker) pada saku baju beliau dan konsultasikan ke dokter spesialis saraf."
    },
    {
        "intent": "konsul_009",
        "pattern": "sering lupa hari tanggal, lupa tahun berapa sekarang, disorientasi waktu, bingung waktu",
        "response": "Lupa tanggal hari ini adalah hal yang wajar jika seseorang masih tahu bulan dan tahunnya. Namun jika seseorang mengira saat ini masih tahun 1990 atau bingung membedakan antara waktu siang dan tengah malam, ini merupakan indikasi disorientasi waktu kronis."
    },
    {
        "intent": "konsul_010",
        "pattern": "kesulitan hitung uang, bingung bayar belanjaan, lupa kelola keuangan, tertipu uang lansia",
        "response": "Kesulitan mengelola tagihan, keliru berhitung uang kembalian, atau mudah tertipu penipuan finansial adalah tanda penurunan fungsi eksekutif korteks frontal otak. Hal ini masuk ke dalam penurunan Instrumental ADL (IADL)."
    },
    {
        "intent": "konsul_011",
        "pattern": "lupa resep masakan, bingung cara masak, tidak bisa ikuti resep, lupa langkah masak",
        "response": "Ketika seorang ibu yang sudah puluhan tahun mahir memasak tiba-tiba bingung langkah menumis bumbu atau lupa memasukkan garam berulang kali, ini menandakan penurunan memori prosedural dan fungsi perencanaan otak."
    },
    {
        "intent": "konsul_012",
        "pattern": "enggan mandi, abai kebersihan diri, lupa ganti baju, bau badan lansia pikun, menolak mandi",
        "response": "Penurunan kebersihan diri pada pasien demensia sering terjadi karena: 1. Mereka merasa sudah mandi padahal belum. 2. Apraksia (kesulitan mengingat urutan membuka pakaian dan menggunakan sabun). 3. Rasa takut pada air dingin atau takut terpeleset."
    },

    # =========================================================================
    # 5. GEJALA KLINIS & DIFERENSIASI MEDIS (12 Intents)
    # =========================================================================
    {
        "intent": "gejala_001",
        "pattern": "beda pikun dan alzheimer, perbedaan pikun biasa, apakah pikun itu alzheimer, pikun normal, perbedaan demensia dan pikun, kapan pikun dianggap bahaya",
        "response": "Perbedaannya: Pikun biasa lupa sesekali dan ingat kembali, fungsi mandiri tetap utuh. Alzheimer melupakan informasi yang baru saja dipelajari, lupa fungsi benda harian, mengalami disorientasi arah/waktu, dan kemandirian hidupnya perlahan menurun."
    },
    {
        "intent": "gejala_002",
        "pattern": "10 tanda alzheimer, gejala awal alzheimer, ciri ciri alzheimer, tanda tanda demensia, gejala kepikunan parah, ciri pikun alzheimer",
        "response": "10 tanda awal Alzheimer: 1. Gangguan memori harian. 2. Sulit merencanakan masalah. 3. Sulit selesaikan tugas akrab. 4. Disorientasi waktu & tempat. 5. Gangguan visuospasial. 6. Masalah komunikasi. 7. Salah taruh barang di tempat aneh. 8. Penurunan pertimbangan akal. 9. Menarik diri dari sosial. 10. Perubahan emosi/sifat."
    },
    {
        "intent": "gejala_003",
        "pattern": "stadium alzheimer, tahapan alzheimer, fase alzheimer, tingkat keparahan alzheimer, mild moderate severe demensia",
        "response": "3 Stadium utama: 1. **Ringan (Mild)**: Kelupaan informasi baru, tersesat di jalan baru, masih mandiri dasar. 2. **Sedang (Moderate)**: Butuh bantuan memilih baju, lupa nama kerabat, sundowning, perubahan perilaku. 3. **Berat (Severe)**: Bergantung total pada caregiver, kehilangan kemampuan bicara dan mobilitas fisik."
    },
    {
        "intent": "gejala_004",
        "pattern": "perubahan perilaku, mudah marah, sering curiga, halusinasi pikun, tuduh orang mencuri, emosi tidak stabil lansia, gelisah malam hari, sundowning",
        "response": "Gejala ini dikenal sebagai **Sindrom Sundowning** dan konfabulasi ingatan. Saat memori hilang, pasien mengisi kekosongan ingatan dengan dugaan barangnya dicuri. Jangan mendebat mereka; alihkan perhatian ke aktivitas yang menenangkan dan jaga pencahayaan ruangan tetap terang."
    },
    {
        "intent": "gejala_005",
        "pattern": "halusinasi demensia, delusi lansia, melihat orang yang tidak ada, bicara sendiri pikun",
        "response": "Halusinasi visual dan delusi dapat muncul pada stadium sedang-berat atau pada Demensia Lewy Body. Validasi ketakutan pasien dengan kalimat menenangkan (contoh: 'Saya di sini menjaga Ibu, Ibu aman bersama saya') daripada memaksakan mendebat kebenarannya."
    },
    {
        "intent": "gejala_006",
        "pattern": "sifat berubah drastis, jadi apatis, jadi kasar, kepribadian berubah total lansia",
        "response": "Perubahan kepribadian terjadi karena atrofi sel saraf pada lobus frontal otak yang mengontrol kendali emosi dan empati. Pasien yang dulunya ramah bisa menjadi pemarah atau sangat pendiam (apatis)."
    },
    {
        "intent": "gejala_007",
        "pattern": "tidur terbalik, bangun tengah malam keluyuran, siang tidur malam melek demensia",
        "response": "Kerusakan pada nukleus suprakiasmatik di hipotalamus mengacaukan ritme sirkadian tubuh pasien. Ajak pasien beraktivitas fisik ringan di bawah sinar matahari pagi dan batasi tidur siang maksimal 30 menit agar malam harinya bisa tidur nyenyak."
    },
    {
        "intent": "gejala_008",
        "pattern": "sulit ukur jarak, sering tersandung, gangguan visuospasial, pandangan buram bukan mata",
        "response": "Otak penderita Alzheimer mengalami kesulitan memproses informasi kedalaman visual (*visuospasial*), sehingga sering tersandung undakan tangga atau kesulitan membedakan karpet hitam dengan lubang lantai."
    },
    {
        "intent": "gejala_009",
        "pattern": "apraksia, susah pakai kancing baju, lupa cara pakai sendok, motorik halus terganggu",
        "response": "Apraksia adalah ketidakmampuan melakukan gerakan motorik terencana meskipun fungsi otot fisiknya masih normal. Berikan pakaian dengan perekat velcro daripada kancing dan sediakan peralatan makan dengan gagang besar yang mudah digenggam."
    },
    {
        "intent": "gejala_010",
        "pattern": "afasia, kesulitan bicara, lupa kosa kata, bicara melantur demensia",
        "response": "Afasia pada Alzheimer menyebabkan kosa kata pasien menyusut drastis. Berbicaralah perlahan, gunakan kalimat pendek, dan bantu tebak maksudnya dengan memperlihatkan objek secara langsung."
    },
    {
        "intent": "gejala_011",
        "pattern": "perbedaan alzheimer dan demensia vaskular, demensia stroke, jenis demensia",
        "response": "Alzheimer berkembang perlahan dan bertahap akibat plak amiloid. Demensia Vaskular biasanya terjadi mendadak atau bertingkat (*stepwise*) setelah kejadian stroke atau gangguan suplai darah ke otak."
    },
    {
        "intent": "gejala_012",
        "pattern": "beda parkinson dan alzheimer, tremor dan pikun, parkinson demensia",
        "response": "Penyakit Parkinson berawal dari gangguan motorik fisik (tremor, kaku otot, lambat bergerak). Sedangkan Alzheimer berawal dari gangguan daya ingat dan fungsi kognitif sebelum menyerang fungsi fisik."
    },

    # =========================================================================
    # 6. TES KOGNITIF & BIOMARKER MEDIS (12 Intents)
    # =========================================================================
    {
        "intent": "tes_001",
        "pattern": "apa itu mmse, tes mmse, skor mmse, mini mental state examination, berapa skor normal mmse, interpretasi mmse, nilai mmse",
        "response": "MMSE (Mini-Mental State Examination) adalah tes kognitif berstandar internasional dengan skor 0–30 poin. Interpretasi: 24–30: Normal; 19–23: Gangguan Kognitif Ringan (MCI); 10–18: Demensia Sedang; <10: Demensia Berat. MMSE adalah salah satu fitur paling dominan pada model XGBoost Neura AI."
    },
    {
        "intent": "tes_002",
        "pattern": "apa itu moca, tes moca, montreal cognitive assessment, beda moca dan mmse",
        "response": "MoCA (Montreal Cognitive Assessment) memiliki sensitivitas lebih tinggi (90%) daripada MMSE untuk mendeteksi MCI (tahap sangat awal). MoCA menguji fungsi eksekutif yang lebih kompleks seperti tes jejak angka dan penamaan hewan."
    },
    {
        "intent": "tes_003",
        "pattern": "tes gambar jam, clock drawing test, tes jam demensia, gambar lingkaran jam",
        "response": "Clock Drawing Test (CDT) meminta pasien menggambar lingkaran jam lengkap dengan angka dan jarum jam penunjuk pukul 11:10. Ketidakmampuan menempatkan jarum jam mencerminkan disfungsi lobus parietal dan frontal otak."
    },
    {
        "intent": "tes_004",
        "pattern": "apa itu adl, skor adl, activities of daily living, kemandirian harian, fungsi aktivitas sehari hari, skor kemandirian",
        "response": "ADL (Activities of Daily Living) mengukur kemandirian fungsional. Terdiri dari Basic ADL (makan, mandi, pakaian) dan Instrumental ADL (IADL: kelola uang, minum obat, memasak, transportasi). Penurunan ADL adalah biomarker utama dalam diagnosa klinis."
    },
    {
        "intent": "tes_005",
        "pattern": "32 biomarker, biomarker neura, fitur apa saja yang dianalisis, parameter pemeriksaan, data apa saja yang dipakai neura",
        "response": "32 Biomarker Neura mencakup 5 domain: 1. Kognitif & Fungsional (MMSE, ADL, FA, Memory Complaints, Behavioral). 2. Demografi (Usia, Gender, Etnis, Edukasi). 3. Komorbiditas (Jantung, Diabetes, Hipertensi, Cedera Kepala). 4. Laboratorium (Kolesterol LDL, HDL, Trigliserida, Tekanan Darah, BMI). 5. Gaya Hidup (Aktivitas Fisik, Kualitas Tidur, Diet, Merokok, Alkohol)."
    },
    {
        "intent": "biomarker_001",
        "pattern": "pengaruh kolesterol pada alzheimer, kolesterol ldl hdl otak, trigliserida dan memori",
        "response": "Kolesterol LDL yang sangat tinggi (>199 mg/dL) dapat memicu aterosklerosis pada pembuluh darah mikro otak, mengurangi aliran oksigen dan mempercepat pembentukan plak beta-amiloid. Sebaliknya, HDL yang optimal bersifat protektif."
    },
    {
        "intent": "biomarker_002",
        "pattern": "hubungan hipertensi dan alzheimer, tekanan darah tinggi otak, sistolik diastolik pikun",
        "response": "Hipertensi kronis merusak integritas sawar darah otak (*blood-brain barrier*), menyebabkan peradangan mikrovaskular dan meningkatkan risiko Alzheimer serta demensia vaskular secara signifikan."
    },
    {
        "intent": "biomarker_003",
        "pattern": "diabetes dan alzheimer, gula darah tinggi bikin pikun, diabetes tipe 3",
        "response": "Alzheimer kerap dijuluki 'Diabetes Tipe 3' karena resistensi insulin di otak menghambat sel neuron menyerap glukosa sebagai bahan bakar energi, yang berujung pada degenerasi dan kematian sel saraf."
    },
    {
        "intent": "biomarker_004",
        "pattern": "obesitas dan alzheimer, pengaruh bmi pada otak, berat badan berlebih pikun",
        "response": "Obesitas pada usia paruh baya (BMI > 30) meningkatkan produksi sitokin inflamasi sistemik dalam tubuh yang dapat menembus sawar darah otak dan memicu atrofi volume materi abu-abu otak."
    },
    {
        "intent": "biomarker_005",
        "pattern": "apakah alzheimer keturunan, faktor genetik alzheimer, gen apoe4, genetik pikun",
        "response": "Gen **APOE-e4** adalah faktor risiko genetik terkuat untuk late-onset Alzheimer. Memiliki satu salinan alel meningkatkan risiko 3x lipat, dua salinan hingga 8–12x lipat. Namun gaya hidup sehat terbukti mampu menekan ekspresi risiko genetik tersebut."
    },
    {
        "intent": "biomarker_006",
        "pattern": "mri otak alzheimer, pet scan otak demensia, ct scan otak pikun",
        "response": "MRI otak mendeteksi penyusutan volume (atrofi) pada area hippocampus dan pembesaran ventrikel otak. Amyloid PET scan dapat memvisualisasikan endapan plak beta-amiloid secara langsung sebelum gejala klinis muncul."
    },
    {
        "intent": "biomarker_007",
        "pattern": "tes darah alzheimer, biomarker darah p-tau217, uji cairan serebrospinal csf",
        "response": "Perkembangan medis terbaru memungkinkan deteksi biomarker protein **p-tau217** dan rasio amiloid beta 42/40 melalui tes darah sederhana dengan akurasi menyerupai uji cairan serebrospinal (lumbal pungsi)."
    },

    # =========================================================================
    # 7. GAYA HIDUP, NUTRISI & PENCEGAHAN (12 Intents)
    # =========================================================================
    {
        "intent": "cegah_001",
        "pattern": "makanan pencegah alzheimer, diet alzheimer, diet mind, diet mediterania, makanan untuk otak, nutrisi cegah pikun, cara menjaga otak sehat",
        "response": "Diet MIND terbukti menurunkan risiko Alzheimer hingga 53%. Prinsip utamanya: Perbanyak sayuran hijau (bayam, kale), buah beri (blueberry), kacang-kacangan, biji-bijian utuh, ikan berlemak Omega-3, dan minyak zaitun murni (EVOO)."
    },
    {
        "intent": "cegah_002",
        "pattern": "10 makanan terbaik untuk otak, buah untuk memori, ikan omega 3 alzheimer",
        "response": "10 Makanan super untuk otak: 1. Ikan salmon/sarden (Omega-3 DHA). 2. Blueberry. 3. Kacang walnut. 4. Bayam/brokoli. 5. Minyak zaitun. 6. Kunyit (Kurkumin). 7. Alpukat. 8. Cokelat hitam (>70%). 9. Telur (Kolin). 10. Teh hijau."
    },
    {
        "intent": "cegah_003",
        "pattern": "makanan pantangan otak, makanan perusak memori, gula dan pikun, gorengan alzheimer",
        "response": "Batasi: 1. Makanan ultra-proses & tinggi gula rafinasi (memicu resistensi insulin otak). 2. Lemak trans dan gorengan berlebih. 3. Daging merah olahan (sosis, kornet). 4. Makanan berpengawet tinggi sodium."
    },
    {
        "intent": "cegah_004",
        "pattern": "manfaat kopi untuk otak, apakah kopi cegah alzheimer, pengaruh kafein pada memori",
        "response": "Konsumsi kopi hitam tanpa gula 1–2 cangkir di pagi hari kaya akan antioksidan polifenol yang dapat menghambat agregasi amiloid dan meningkatkan kewaspadaan kognitif. Hindari konsumsi di atas jam 14.00 agar tidak merusak kualitas tidur."
    },
    {
        "intent": "cegah_005",
        "pattern": "olahraga untuk otak, senam otak, latihan kognitif, cara melatih memori, aktivitas fisik alzheimer, mencegah kepikunan lansia",
        "response": "Stimulasi kognitif harian: Belajar keterampilan baru (bahasa asing, instrumen musik), membaca buku, mengisi teka-teki silang, bermain catur, dan menghafal nomor telepon kerabat tanpa melihat ponsel."
    },
    {
        "intent": "cegah_006",
        "pattern": "olahraga aerobik lansia, jalan kaki cegah pikun, aktivitas fisik otak, bdnf olahraga",
        "response": "Jalan cepat 30 menit sehari (150 menit/minggu) merangsang produksi protein **BDNF (Brain-Derived Neurotrophic Factor)** yang memicu pertumbuhan sel saraf baru (*neurogenesis*) di area hippocampus."
    },
    {
        "intent": "cegah_007",
        "pattern": "pengaruh tidur pada alzheimer, tidur malam dan pikun, insomnia dan demensia, sistem glimfatik, plak amiloid tidur",
        "response": "Saat tidur nyenyak non-REM, Sistem Glimfatik memompa cairan serebrospinal untuk membersihkan racun otak, termasuk plak beta-amiloid dan protein tau. Kurang tidur kronis mempercepat penumpukan amiloid hingga 30%."
    },
    {
        "intent": "cegah_008",
        "pattern": "bahaya merokok untuk otak, alkohol dan alzheimer, rokok merusak memori",
        "response": "Merokok menyempitkan pembuluh darah mikro otak dan memicu stres oksidatif tinggi. Konsumsi alkohol berlebih menyebabkan atrofi materi putih otak dan meningkatkan risiko demensia alkoholik."
    },
    {
        "intent": "cegah_009",
        "pattern": "manfaat sosialisasi lansia, silaturahmi cegah pikun, interaksi sosial otak",
        "response": "Interaksi sosial aktif melatih berbagai area otak secara serempak (memproses bahasa, membaca emosi lawan bicara, dan mengingat topik). Lansia yang aktif bersosialisasi memiliki risiko demensia 50% lebih rendah."
    },
    {
        "intent": "cegah_010",
        "pattern": "suplemen daya ingat, vitamin untuk memori, omega 3 otak, vitamin b12 pikun, ginkgo biloba",
        "response": "Suplemen terbukti: Asam lemak Omega-3 (EPA/DHA) dan Vitamin B12 (terutama bagi lansia yang mengalami penurunan penyerapan lambung). Selalu konsultasikan dosis dengan dokter sebelum konsumsi suplemen."
    },
    {
        "intent": "cegah_011",
        "pattern": "kesehatan gigi dan alzheimer, radang gusi dan otak, bakteri porphyromonas gingivalis",
        "response": "Bakteri penyebab radang gusi (*Porphyromonas gingivalis*) dapat masuk ke aliran darah menuju otak dan memicu peradangan kronis yang mempercepat pembentukan plak Alzheimer. Sikat gigi 2x sehari dan periksa ke dokter gigi tiap 6 bulan."
    },
    {
        "intent": "cegah_012",
        "pattern": "kebisingan dan pendengaran alzheimer, alat bantu dengar demensia, gangguan dengar lansia",
        "response": "Gangguan pendengaran yang tidak ditangani adalah salah satu faktor risiko demensia terbesar yang dapat dimodifikasi. Menggunakan alat bantu dengar terbukti mampu memperlambat penurunan kognitif secara signifikan."
    },

    # =========================================================================
    # 8. PANDUAN PENGASUH & KESELAMATAN (CAREGIVER) (10 Intents)
    # =========================================================================
    {
        "intent": "caregiver_001",
        "pattern": "tips menjaga keamanan pasien alzheimer di rumah, keamanan pasien alzheimer, cara mengamankan rumah untuk lansia pikun, tips keselamatan lansia di rumah, keamanan rumah lansia",
        "response": "Amankan rumah: 1. Pasang pegangan tangan (*grab bars*) di kamar mandi dan alas anti-selip. 2. Singkirkan kabel melintang dan karpet licin. 3. Pasang pengaman kompor gas. 4. Beri lampu malam otomatis di lorong kamar mandi."
    },
    {
        "intent": "caregiver_002",
        "pattern": "mencegah pasien alzheimer tersesat, tips mencegah lansia kabur, wandering prevention demensia, lansia keluyuran",
        "response": "Pencegahan tersesat: 1. Pasang kunci tambahan di bagian atas/bawah pintu di luar jangkauan pandangan mata. 2. Sematkan perangkat GPS tracker pada sepatu atau kalung pasien. 3. Berikan gelang identitas medis anti-lepas dengan kontak keluarga."
    },
    {
        "intent": "caregiver_003",
        "pattern": "cara bicara dengan penderita alzheimer, komunikasi dengan orang pikun, cara sabar menghadapi lansia demensia",
        "response": "Kaidah komunikasi: Bicara dengan nada lembut, tatap mata, gunakan kalimat pendek dan satu instruksi dalam satu waktu. **Hindari berdebat**: bila pasien keliru, validasi emosinya lalu alihkan perhatian (*distract & redirect*)."
    },
    {
        "intent": "caregiver_004",
        "pattern": "pasien menolak mandi, susah disuruh minum obat, lansia ngamuk disuruh mandi",
        "response": "Gunakan pendekatan tanpa paksaan: Ganti kalimat 'Ayo mandi sekarang' dengan 'Yuk kita cuci muka dengan air hangat yang segar'. Pastikan air bersuhu hangat suam kuku dan putar musik favoritnya untuk mengurangi kecemasan."
    },
    {
        "intent": "caregiver_005",
        "pattern": "panduan merawat pasien alzheimer untuk caregiver, tips untuk caregiver alzheimer, burnout pengasuh demensia, stres merawat orang tua pikun",
        "response": "Merawat pasien Alzheimer rentan memicu burnout. Terapkan sistem bergantian dengan keluarga lain, luangkan waktu untuk *respite care* (istirahat pribadi), dan bergabunglah dengan kelompok pendukung keluarga demensia."
    },
    {
        "intent": "caregiver_006",
        "pattern": "komunitas alzheimer indonesia, alzi indonesia, yayasan alzheimer, support group demensia",
        "response": "Di Indonesia terdapat organisasi nirlaba **Alzheimer Indonesia (ALZI)** yang menyediakan konseling caregiver, memory cafe, senam otak rutin, dan edukasi 'Jangan Maklum Dengan Pikun'. Kunjungi situs resmi alzi.or.id untuk bergabung."
    },
    {
        "intent": "caregiver_007",
        "pattern": "aktivitas santai bersama lansia, kegiatan harian pasien demensia, stimulasi lansia di rumah",
        "response": "Ajak pasien dalam aktivitas bermakna sederhana: melipat pakaian, menyiram tanaman di pagi hari, meronce manik-manik besar, mendengarkan lagu nostalgia masa muda, atau melihat album foto keluarga lama."
    },
    {
        "intent": "caregiver_008",
        "pattern": "cara menghadapi pertanyaan berulang kali, sabar menghadapi pengulangan demensia",
        "response": "Sadari bahwa pasien tidak ingat bahwa ia baru saja bertanya. Jawablah dengan sabar menggunakan kalimat pendek yang sama, atau pasang papan pengumuman bertuliskan jadwal harian (contoh: 'Makan siang jam 12.00') di dinding yang mudah terlihat."
    },
    {
        "intent": "caregiver_009",
        "pattern": "nutrisi makan lansia susah makan, pasien demensia tidak mau makan, sulit menelan disfagia",
        "response": "Jika pasien sulit menelan (*disfagia*), sajikan makanan bertekstur lembut (bubur saring, puree sup krim bergizi). Sajikan makanan dalam porsi kecil namun sering, dan gunakan piring berwarna kontras agar makanan terlihat jelas."
    },
    {
        "intent": "caregiver_010",
        "pattern": "menghadapi tuduhan mencuri, dituduh mencuri oleh orang tua pikun, paranoid lansia",
        "response": "Jangan mendebat atau membela diri secara emosional. Katakan: 'Oh uang Ibu hilang ya? Mari kita cari bersama-sama'. Siapkan barang cadangan (misal: dompet duplikat berisi uang mainan) untuk diberikan saat pencarian."
    },

    # =========================================================================
    # 9. NAVIGASI DOKTER, OBAT & MEDIS (10 Intents)
    # =========================================================================
    {
        "intent": "dokter_001",
        "pattern": "kapan ke dokter, tanda bahaya pikun, red flags alzheimer, kapan harus periksa saraf",
        "response": "Segera ke dokter saraf jika ditemukan tanda bahaya (*red flags*): 1. Tersesat di rute biasa. 2. Tidak mengenali anggota keluarga serumah. 3. Mengalami halusinasi atau menuduh tanpa dasar. 4. Penurunan kognitif terjadi drastis dalam beberapa minggu."
    },
    {
        "intent": "dokter_002",
        "pattern": "dokter apa untuk alzheimer, periksa ke mana, spesialis saraf, neurolog, psikiater geriatri",
        "response": "Dokter yang tepat: **Dokter Spesialis Neurologi/Saraf (Sp.N)**, khususnya konsultan Neurobehavior. Bila didominasi perubahan perilaku agresif, halusinasi, atau depresi, dapat berkonsultasi ke **Dokter Spesialis Kedokteran Jiwa (Sp.KJ) Geriatri**."
    },
    {
        "intent": "dokter_003",
        "pattern": "persiapan saat periksa ke dokter spesialis saraf, apa saja yang perlu disiapkan ke dokter, persiapan saat membawa pasien ke dokter, apa yang harus dibawa ke dokter saraf",
        "response": "Siapkan: 1. Catatan kronologis gejala (kapan mulai lupa dan seberapa sering). 2. Daftar semua obat/suplemen yang dikonsumsi saat ini. 3. Riwayat penyakit keluarga dan komorbiditas (hipertensi, diabetes, stroke)."
    },
    {
        "intent": "dokter_004",
        "pattern": "apakah alzheimer bisa sembuh, obat alzheimer, apakah pikun bisa sembuh, terapi alzheimer, pengobatan demensia",
        "response": "Saat ini belum ada obat yang menyembuhkan Alzheimer secara total. Namun intervensi medis dini sangat krusial untuk memperlambat laju keparahan, mengontrol gejala emosi, dan menjaga kemandirian fungsional pasien lebih lama."
    },
    {
        "intent": "dokter_005",
        "pattern": "obat donepezil memantine, obat resep dokter untuk alzheimer, rivastigmine obat pikun",
        "response": "Golongan obat utama: 1. **Cholinesterase Inhibitors** (Donepezil, Rivastigmine, Galantamine) untuk meningkatkan neurotransmiter asetilkolin. 2. **NMDA Receptor Antagonist** (Memantine) untuk melindungi saraf dari toksisitas glutamat berlebih. Wajib dengan resep dokter saraf."
    },
    {
        "intent": "dokter_006",
        "pattern": "terapi non obat untuk alzheimer, fisioterapi demensia, terapi okupasi memori, terapi musik",
        "response": "Terapi non-farmakologis meliputi: Terapi Stimulasi Kognitif (CST), terapi musik nostalgia, fisioterapi mobilitas, dan terapi okupasi untuk mempertahankan keterampilan makan serta berpakaian mandiri."
    },
    {
        "intent": "dokter_007",
        "pattern": "apakah periksa alzheimer ditanggung bpjs, bpjs kesehatan dokter saraf, biaya tes mmse mri bpjs",
        "response": "Ya, pemeriksaan dokter spesialis saraf, tes kognitif MMSE, pemeriksaan radiologi MRI/CT Scan otak (sesuai indikasi medis), serta obat-obatan rutin Alzheimer ditanggung oleh BPJS Kesehatan melalui rujukan berjenjang dari faskes tingkat pertama (Puskesmas/Klinik)."
    },
    {
        "intent": "dokter_008",
        "pattern": "apa itu antibodi lecanemab donanemab, obat baru alzheimer fda, terapi penghancur amiloid",
        "response": "Lecanemab (Leqembi) dan Donanemab adalah antibodi monoklonal inovatif yang telah disetujui FDA untuk menargetkan dan melarutkan plak beta-amiloid pada pasien Alzheimer stadium awal (MCI)."
    },
    {
        "intent": "dokter_009",
        "pattern": "apakah anestesi operasi bisa bikin pikun lansia, efek bius total pada memori, postoperative cognitive dysfunction",
        "response": "Bius total pada lansia dapat memicu Postoperative Cognitive Dysfunction (POCD) sesaat pasca-operasi. Kondisi ini umumnya membaik dalam beberapa minggu dengan pemulihan hidrasi dan nutrisi yang adekuat."
    },
    {
        "intent": "dokter_010",
        "pattern": "bedanya stroke dan alzheimer, stroke bikin pikun, stroke infark otak memori",
        "response": "Stroke terjadi mendadak akibat sumbatan atau pecahnya pembuluh darah otak dan memicu kelumpuhan fisik mendadak. Jika stroke merusak area memori, kondisi ini disebut Demensia Pasca-Stroke (Vaskular)."
    },

    # =========================================================================
    # 10. PANDUAN PENGGUNAAN PLATFORM NEURA AI (10 Intents)
    # =========================================================================
    {
        "intent": "bantuan_001",
        "pattern": "menu neura, cara pakai neura, panduan aplikasi neura, fitur neura ai, cara menggunakan chatbot ini",
        "response": "Panduan Cepat Neura AI: 1. **Ketik pesan biasa**: Untuk konsultasi seputar daya ingat dan gaya hidup. 2. **Perintah Cepat**: Ketik `/predict` (skrining), `/eval` (evaluasi model), `/train` (latih model), `/status` (status sistem). 3. **Voice Mode**: Klik ikon mikrofon untuk konsultasi suara real-time."
    },
    {
        "intent": "bantuan_002",
        "pattern": "apa itu predict, cara pakai predict, simulasi predict, perintah predict, /predict",
        "response": "Ketik `/predict` untuk membuka simulasi prediksi diagnosis Alzheimer interaktif. Anda dapat memasukkan nilai MMSE, ADL, Functional Assessment, dan biomarker klinis lainnya untuk melihat estimasi probabilitas risiko secara instan."
    },
    {
        "intent": "bantuan_003",
        "pattern": "apa itu train, cara latih model, perintah train, melatih xgboost, /train",
        "response": "Ketik `/train [epoch]` (contoh: `/train 50`) untuk melatih algoritma XGBoost Classifier pada 2.149 data rekam medis pasien di server backend Neura."
    },
    {
        "intent": "bantuan_004",
        "pattern": "apa itu eval, cara evaluasi model, perintah eval, metrik akurasi neura, /eval",
        "response": "Ketik `/eval` untuk memeriksa metrik performa model terkini: Akurasi (95.35%), ROC-AUC (94.11%), Sensitivity/Recall (92.11%), F1-Score, dan matriks konfusi validasi."
    },
    {
        "intent": "bantuan_005",
        "pattern": "apa itu status, cara cek status model, perintah status, status sistem neura, /status",
        "response": "Ketik `/status` untuk melihat status aktif model XGBoost, keberadaan checkpoint JSON, jumlah fitur klinis yang aktif (32 dimensi), dan status lingkungan server."
    },
    {
        "intent": "bantuan_006",
        "pattern": "apa itu help, bantuan perintah, daftar perintah neura, command list, /help",
        "response": "Daftar Perintah Neura: • `/predict` : Jalankan prediksi diagnosis • `/train [n]` : Latih model n epoch • `/eval` : Tampilkan metrik evaluasi • `/status` : Periksa kesiapan model • `/intro` : Ringkasan Neura AI • `/help` : Bantuan perintah."
    },
    {
        "intent": "bantuan_007",
        "pattern": "cara pakai suara, mode suara, konsultasi suara, livekit voice consultation, mic neura",
        "response": "Klik tombol 'Voice Consultation' di navbar atau klik ikon mikrofon pada bar pesan untuk membuka ruang konsultasi suara real-time bertenaga WebRTC LiveKit. Bicara secara alami layaknya dengan dokter klinis."
    },
    {
        "intent": "bantuan_008",
        "pattern": "seberapa akurat neura ai, validasi data neura, apakah hasil neura bisa dipercaya, akurasi xgboost",
        "response": "Model XGBoost Neura AI memiliki tingkat akurasi 95.35% dan ROC-AUC 94.11% pada 430 sampel pasien validasi holdout. Namun Neura dirancang sebagai instrumen skrining dini, bukan pengganti penegakan diagnosis resmi dokter spesialis saraf."
    },
    {
        "intent": "bantuan_009",
        "pattern": "apakah data saya aman di neura, privasi data pasien, keamanan data medis, kerahasiaan konsultasi",
        "response": "Data Anda diproses secara lokal dengan standar privasi ketat. Sesi konsultasi dienkripsi dan kami tidak memperjualbelikan rekam medis atau informasi pribadi Anda kepada pihak ketiga."
    },
    {
        "intent": "bantuan_010",
        "pattern": "cara logout dari neura, cara keluar akun, ganti akun neura, sign out",
        "response": "Untuk keluar dari akun Neura AI, klik ikon Logout (pintu keluar) di pojok kiri bawah sidebar Anda di samping foto profil, atau klik tombol 'Ganti Akun / Keluar' pada jendela autentikasi."
    },

    # =========================================================================
    # 11. KLARIFIKASI, FEEDBACK & PENUTUP (11 Intents)
    # =========================================================================
    {
        "intent": "tutup_001",
        "pattern": "selamat tinggal, dadah, bye, sampai jumpa, pamit, sampai bertemu lagi",
        "response": "Sampai jumpa! Terima kasih telah menggunakan Neura AI. Senang bisa berbagi wawasan kesehatan dengan Anda. Semoga Anda dan keluarga senantiasa sehat dan bahagia!"
    },
    {
        "intent": "tutup_002",
        "pattern": "aku mau tidur dulu, pamit tidur, ngantuk mau tidur, tidur dulu ya neura",
        "response": "Selamat tidur dan selamat beristirahat! Biarkan otak Anda meregenerasi sel-sel saraf dan membersihkan sisa racun metabolik malam ini. Sampai bertemu besok!"
    },
    {
        "intent": "tutup_003",
        "pattern": "semoga sehat selalu, doa untuk keluarga, jaga kesehatan, semoga berkah",
        "response": "Aamiin ya Rabbal Alamin. Terima kasih atas doa yang tulus! Semoga kesehatan, ketajaman daya ingat, dan kebahagiaan selalu melimpahi Anda dan seluruh keluarga tercinta."
    },
    {
        "intent": "klarifikasi_001",
        "pattern": "maksudnya bagaimana, tolong jelaskan lebih sederhana, bahasanya terlalu rumit, jelaskan singkat, bingung",
        "response": "Tentu, mari kita sederhanakan: Bayangkan otak kita seperti perpustakaan besar. Pada orang sehat, buku baru mudah ditaruh di rak dan diambil kembali. Pada penderita Alzheimer, petugas perpustakaan lupa di mana menaruh buku baru tersebut. Apakah analogi ini lebih mudah dipahami?"
    },
    {
        "intent": "klarifikasi_002",
        "pattern": "bisa berikan contoh nyatanya, berikan contoh kasus, contoh kongkritnya, seperti apa contohnya",
        "response": "Contoh nyata: Ibu Ani (70 tahun) biasa memasak rendang setiap hari raya tanpa melihat resep. Namun tahun ini, beliau 4 kali bertanya pada anaknya 'Bumbu rendang apa saja ya nak?' dalam 1 jam, dan kelupaan memasukkan santan. Inilah contoh gangguan memori prosedural dan jangka pendek."
    },
    {
        "intent": "klarifikasi_003",
        "pattern": "tolong buatkan ringkasan singkatnya, rangkumkan, poin poin pentingnya apa, inti sarinya",
        "response": "Inti sarinya dalam 3 poin: 1. Penyakit Alzheimer bukan bagian penuaan normal. 2. Deteksi dini via tes kognitif (MMSE/ADL) sangat krusial. 3. Pencegahan terbaik: Pola makan Diet MIND, olahraga jalan cepat 150 menit/minggu, dan tidur nyenyak 7-8 jam."
    },
    {
        "intent": "klarifikasi_004",
        "pattern": "can you speak english, apakah bisa bahasa inggris, english language, do you understand english",
        "response": "Yes, I can understand and respond in English as well! Feel free to ask any questions regarding memory health, Alzheimer's screening, clinical biomarkers, or healthy brain lifestyle."
    },
    {
        "intent": "disclaimer_001",
        "pattern": "apakah jawabanmu saran dokter resmi, apakah ini diagnosis dokter, disclaimer medis, tanggung jawab hukum",
        "response": "Penafian Medis (*Medical Disclaimer*): Informasi dan hasil analisis Neura AI adalah instrumen skrining edukatif berbasis machine learning dan bukan merupakan pengganti diagnosis medis resmi, vonis klinis, atau rencana terapi dari Dokter Spesialis Saraf (Sp.N)."
    },
    {
        "intent": "feedback_001",
        "pattern": "jawabannya sangat membantu, ini yang saya cari, penjelasannya sangat bagus, informatif sekali",
        "response": "Alhamdulillah, saya sangat senang mendengarnya! Tujuan utama Neura adalah memberikan pemahaman medis yang jelas, menenangkan, dan bermanfaat bagi Anda dan keluarga."
    },
    {
        "intent": "feedback_002",
        "pattern": "jawabannya kurang jelas, belum paham, kurang puas, bukan itu maksud saya",
        "response": "Mohon maaf jika penjelasan sebelumnya belum menjawab maksud Anda. Silakan jelaskan kembali pertanyaan atau keluhan Anda dengan sudut pandang yang berbeda, dan saya akan bantu jawab dengan senang hati."
    },
    {
        "intent": "salam_012",
        "pattern": "tes, tes 1 2 3, testing, halo tes, cek koneksi, halo apa kamu aktif",
        "response": "Sistem Neura AI aktif 100% dan terhubung dengan baik! Silakan ketik pertanyaan atau konsultasi apa pun yang ingin Anda diskusikan."
    },
    {
        "intent": "fallback_001",
        "pattern": "di luar topik, di luar dataset, di luar konteks, tidak ada di dataset, pertanyaan tidak relevan, hal acak di luar percakapan, di luar cakupan, out of scope, tidak bisa dijawab",
        "response": "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Saat ini Neura AI dirancang secara khusus untuk berfokus pada skrining awal kesehatan daya ingat, deteksi dini risiko penyakit Alzheimer, analisis 32 biomarker klinis, dan edukasi gaya hidup sehat untuk otak. Silakan ajukan pertanyaan seputar kesehatan memori atau gunakan perintah /predict."
    },
    {
        "intent": "fallback_002",
        "pattern": "pertanyaan di luar topik, topik tidak nyambung, di luar bidang alzheimer, tidak ada hubungan dengan memori, hal lain di luar kesehatan",
        "response": "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Topik atau pertanyaan yang Anda sampaikan berada di luar basis data percakapan klinis Neura AI. Saya siap membantu Anda jika ingin berkonsultasi mengenai tanda-tanda awal demensia, tes kognitif MMSE, skor kemandirian ADL, atau nutrisi ramah otak."
    },
    {
        "intent": "fallback_003",
        "pattern": "apakah kamu tahu resep masakan, siapa artis ini, ramalan cuaca, berita politik, harga saham, kurs mata uang",
        "response": "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Sebagai asisten skrining kognitif medis, cakupan saya terbatas pada pencegahan dan deteksi dini Alzheimer, panduan caregiver lansia, serta simulasi biomarker klinis. Silakan ajukan pertanyaan terkait topik kesehatan daya ingat."
    },
    {
        "intent": "fallback_004",
        "pattern": "jawaban tidak ditemukan, kamu tidak paham ini, topik ini tidak ada di sistem, tidak ada di database kamu",
        "response": "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Informasi mengenai hal tersebut tidak tersedia di dalam basis pengetahuan Neura AI. Anda dapat mencoba menanyakan perbedaan pikun biasa vs Alzheimer, faktor risiko demensia, atau ketik /help untuk panduan lengkap."
    },
    {
        "intent": "fallback_005",
        "pattern": "pertanyaan umum acak, hal di luar medis, pertanyaan di luar keahlian, topik lain",
        "response": "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Pertanyaan tersebut berada di luar cakupan konsultasi medis Neura AI. Silakan ajukan pertanyaan seputar keluhan daya ingat orang tua, skrining faktor risiko genetik dan vaskular, atau jalankan simulasi klinis /predict."
    }
]


def export_chat_intents():
    target_csv = Path("datasets/chat_intents.csv")
    raw_csv = Path("data/raw/chat_intents.csv")

    target_csv.parent.mkdir(parents=True, exist_ok=True)
    raw_csv.parent.mkdir(parents=True, exist_ok=True)

    print(f"Menulis {len(INTENTS_DATA)} intent percakapan ke:")
    print(f"  - {target_csv.resolve()}")
    print(f"  - {raw_csv.resolve()}")

    # 1. Tulis ke CSV
    for p in [target_csv, raw_csv]:
        with open(p, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["intent", "pattern", "response"])
            writer.writeheader()
            for item in INTENTS_DATA:
                writer.writerow({
                    "intent": item["intent"],
                    "pattern": item["pattern"],
                    "response": item["response"].replace("\n", " ")
                })

    print(f"Berhasil mengekspor {len(INTENTS_DATA)} intent ke file CSV.")


if __name__ == "__main__":
    export_chat_intents()
