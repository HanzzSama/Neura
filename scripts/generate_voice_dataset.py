"""
scripts/generate_voice_dataset.py
=================================
Generator 100 Dataset Output Voice Neura dengan Struktur Paragraf Berstandar Internasional.
Mematuhi kaidah penulisan komunikasi medis dan tipografi internasional:
  - Paragraf 1 (Orientasi & Empati): Sambutan hangat, validasi keluhan secara empati.
  - Paragraf 2 (Elaborasi Klinis & Intisari): Penjelasan inti berbasis bukti medis (evidence-based).
  - Paragraf 3 (Tindak Lanjut & Disclaimer): Saran langkah konkret dan penegasan skrining awal.
"""

import csv
import json
import os
from pathlib import Path

VOICE_DATASET = [
    # =========================================================================
    # KELOMPOK 1: SAPAAN KLINIS SUARA & PEMBUKA KONSULTASI (10 Data)
    # =========================================================================
    {
        "intent": "voice_salam_001",
        "category": "sapaan_suara",
        "pattern": "halo neura, tes suara, apakah suaraku terdengar, halo asisten suara, tes mic",
        "response": (
            "Halo! Suara Anda terdengar sangat jernih dan baik di sistem Neura AI.\n\n"
            "Saya adalah asisten suara klinis Neura yang siap mendampingi Anda berdiskusi seputar kesehatan daya ingat, fungsi kognitif otak, serta skrining awal risiko demensia Alzheimer.\n\n"
            "Silakan ceritakan apa yang sedang Anda rasakan atau keluhkan mengenai kesehatan memori hari ini."
        )
    },
    {
        "intent": "voice_salam_002",
        "category": "sapaan_suara",
        "pattern": "selamat pagi neura, pagi suara, assalamualaikum neura suara, halo selamat pagi",
        "response": (
            "Selamat pagi! Senang sekali bisa menyapa dan mendengar suara Anda di sesi konsultasi Neura hari ini.\n\n"
            "Pagi hari adalah waktu yang sangat baik untuk memantau kebugaran pikiran dan aktivitas harian Anda. Menjaga hidrasi dan sarapan bergizi seimbang merupakan awal terbaik untuk melindungi sel-sel saraf otak.\n\n"
            "Apakah ada topik kesehatan daya ingat atau pertanyaan khusus yang ingin Anda diskusikan bersama saya pagi ini?"
        )
    },
    {
        "intent": "voice_salam_003",
        "category": "sapaan_suara",
        "pattern": "selamat siang neura, siang asisten suara, siang neura",
        "response": (
            "Selamat siang! Terima kasih telah terhubung ke saluran konsultasi suara Neura AI.\n\n"
            "Jika di tengah kesibukan siang ini Anda atau anggota keluarga merasakan kelelahan mental, kesulitan berkonsentrasi, atau mudah lupa, saya siap membantu mengevaluasi keluhan tersebut secara terarah.\n\n"
            "Apa hal utama seputar memori atau kesehatan otak yang ingin Anda tanyakan saat ini?"
        )
    },
    {
        "intent": "voice_salam_004",
        "category": "sapaan_suara",
        "pattern": "selamat sore neura, sore suara, sore asisten",
        "response": (
            "Selamat sore! Selamat beristirahat sejenak setelah melewati rangkaian aktivitas hari ini.\n\n"
            "Sesi konsultasi suara Neura dirancang agar Anda dapat berbicara secara santai dan leluasa, baik mengenai pengamatan daya ingat pribadi maupun perubahan perilaku orang tua di rumah.\n\n"
            "Bagaimana kondisi daya ingat Anda atau kerabat terdekat Anda belakangan ini?"
        )
    },
    {
        "intent": "voice_salam_005",
        "category": "sapaan_suara",
        "pattern": "selamat malam neura, malam suara, malam asisten neura",
        "response": (
            "Selamat malam! Suasana yang tenang sangat mendukung untuk melakukan refleksi dan konsultasi kesehatan kognitif secara nyaman.\n\n"
            "Kualitas tidur malam yang cukup dan nyenyak memiliki peran biologis vital, yaitu mengaktifkan sistem glimfatik otak untuk membersihkan protein amiloid yang berpotensi memicu Alzheimer.\n\n"
            "Ada keluhan atau hal yang mengganjal di pikiran Anda sebelum beristirahat malam ini?"
        )
    },
    {
        "intent": "voice_salam_006",
        "category": "sapaan_suara",
        "pattern": "bagaimana cara kerja konsultasi suara ini, bagaimana cara pakainya, panduan suara",
        "response": (
            "Konsultasi suara Neura bekerja secara interaktif dan real-time layaknya Anda berbicara langsung dengan praktisi kesehatan kognitif.\n\n"
            "Anda cukup berbicara secara wajar tanpa terburu-buru. Sistem Neura akan mentranskripsikan suara Anda, menganalisis indikator keluhan secara cerdas, dan memberikan penjelasan klinis terstruktur serta ringkas.\n\n"
            "Kapan pun Anda siap, silakan mulai dengan menceritakan usia atau gejala memori yang ingin Anda konsultasikan."
        )
    },
    {
        "intent": "voice_salam_007",
        "category": "sapaan_suara",
        "pattern": "apakah suaraku direkam, privasi suara, keamanan data suara neura",
        "response": (
            "Privasi dan keamanan data klinis Anda merupakan prioritas integritas tertinggi di sistem Neura AI.\n\n"
            "Setiap percakapan suara diproses secara aman melalui protokol terenkripsi dan hanya dimanfaatkan untuk memfasilitasi analisis skrining kognitif pada sesi konsultasi Anda yang sedang berjalan.\n\n"
            "Anda dapat berkonsultasi dengan tenang dan leluasa tanpa rasa khawatir. Ada gejala yang ingin Anda bagikan?"
        )
    },
    {
        "intent": "voice_salam_008",
        "category": "sapaan_suara",
        "pattern": "siapa kamu asisten suara, suara siapa ini, perkenalkan dirimu voice",
        "response": (
            "Saya adalah **Neura Voice Assistant**, asisten kecerdasan buatan klinis untuk skrining awal kesehatan kognitif dan risiko penyakit Alzheimer.\n\n"
            "Saya terintegrasi dengan mesin pembelajaran mesin klinis Neura yang menganalisis 32 parameter biomarker medis, riwayat fungsional harian, serta indikator tes memori standar internasional.\n\n"
            "Saya siap membantu Anda memahami gejala daya ingat dengan bahasa yang ramah, jelas, dan berbasis fakta medis."
        )
    },
    {
        "intent": "voice_salam_009",
        "category": "sapaan_suara",
        "pattern": "terima kasih suaranya sangat jelas, terima kasih neura voice, makasih ya",
        "response": (
            "Sama-sama! Sangat membahagiakan bagi saya dapat membantu memberikan kejelasan dan ketenangan bagi Anda.\n\n"
            "Menjaga kepedulian terhadap kesehatan otak sejak dini adalah langkah preventif terbaik untuk memastikan kualitas hidup lansia yang mandiri dan bahagia di masa depan.\n\n"
            "Jika ada hal lain yang ingin Anda pastikan atau tanyakan kembali, saya selalu siap mendengarkan."
        )
    },
    {
        "intent": "voice_salam_010",
        "category": "sapaan_suara",
        "pattern": "saya ingin mengakhiri sesi suara, pamit dulu neura, tutup voice consultation",
        "response": (
            "Baik, terima kasih banyak telah meluangkan waktu berharga Anda untuk berkonsultasi bersama Neura Voice Assistant hari ini.\n\n"
            "Catatan rangkuman percakapan ini tersimpan rapi di riwayat sesi Anda. Jangan ragu untuk berkonsultasi kembali kapan pun Anda membutuhkan arahan seputar daya ingat.\n\n"
            "Semoga Anda dan keluarga selalu dilimpahi kesehatan dan kebahagiaan. Sampai jumpa di kesempatan berikutnya!"
        )
    },

    # =========================================================================
    # KELOMPOK 2: TRIASE KELUHAN MEMORI & GEJALA AWAL KOGNITIF (15 Data)
    # =========================================================================
    {
        "intent": "voice_gejala_001",
        "category": "gejala_kognitif",
        "pattern": "saya sering lupa menaruh kunci atau dompet, sering lupa naruh barang, apakah ini alzheimer",
        "response": (
            "Lupa menaruh benda harian seperti kunci atau dompet adalah keluhan yang sangat sering dialami banyak orang.\n\n"
            "Pada penuaan wajar, seseorang umumnya masih mampu menelusuri kembali langkah-langkah sebelumnya hingga menemukan barang tersebut. Namun, pada indikasi awal demensia Alzheimer, penderita kerap menaruh barang di tempat yang sangat tidak lazim dan kehilangan kemampuan untuk mengingat kembali alur kejadiannya.\n\n"
            "Apakah keluhan lupa ini disertai dengan kesulitan mengingat nama orang terdekat atau tanggal hari ini?"
        )
    },
    {
        "intent": "voice_gejala_002",
        "category": "gejala_kognitif",
        "pattern": "sering mengulang pertanyaan yang sama, orang tua mengulang cerita berulang-ulang, repetisi ucapan",
        "response": (
            "Mengulang pertanyaan atau cerita yang sama dalam rentang beberapa menit merupakan salah satu tanda khas gangguan memori jangka pendek.\n\n"
            "Kondisi ini terjadi karena hipokampus, bagian otak yang bertanggung jawab mentransfer informasi baru ke memori jangka panjang, mengalami penurunan fungsi sehingga percakapan barusan tidak tersimpan dengan sempurna.\n\n"
            "Saya menyarankan Anda menyikapi hal ini dengan sabar tanpa membantah, dan pertimbangkan untuk menjadwalkan pemeriksaan kognitif formal ke dokter saraf."
        )
    },
    {
        "intent": "voice_gejala_003",
        "category": "gejala_kognitif",
        "pattern": "kesulitan menemukan kata yang tepat, lupa nama benda umum, bicara tersendat-sendat",
        "response": (
            "Kondisi kesulitan menemukan kosakata umum atau menamai objek sehari-hari dikenal dalam terminologi klinis sebagai gejala **afasia anomik**.\n\n"
            "Jika sesekali terjadi karena kelelahan, hal itu masih tergolong wajar. Namun, bila penderita mulai mengganti kata dengan istilah yang tidak pas secara terus-menerus, ini mengindikasikan adanya gangguan pada area pemrosesan bahasa di lobus temporal dan parietal otak.\n\n"
            "Apakah penderita juga mengalami hambatan dalam memahami percakapan yang agak panjang?"
        )
    },
    {
        "intent": "voice_gejala_004",
        "category": "gejala_kognitif",
        "pattern": "tersesat di jalan yang biasa dilewati, disorientasi arah jalan pulang, lupa jalan pulang",
        "response": (
            "Disorientasi spasial atau tersesat di rute yang sudah bertahun-tahun dihafal merupakan tanda waspada penting yang memerlukan perhatian segera.\n\n"
            "Gangguan ini mencerminkan berkurangnya pemetaan spasial dan fungsi navigasi otak di area parahipokampus dan korteks entorhinal, yang sering kali menjadi manifestasi awal penyakit Alzheimer tahap ringan hingga sedang.\n\n"
            "Untuk keselamatan, pastikan penderita selalu didampingi saat bepergian dan lengkapi dengan kartu identitas darurat atau perangkat pelacak GPS."
        )
    },
    {
        "intent": "voice_gejala_005",
        "category": "gejala_kognitif",
        "pattern": "lupa hari tanggal dan waktu, disorientasi waktu, sering mengira siang padahal malam",
        "response": (
            "Kehilangan orientasi waktu, seperti lupa hari, bulan, tahun, atau tertukar antara siang dan malam, adalah salah satu parameter penting dalam evaluasi fungsi kognitif.\n\n"
            "Pada individu sehat, kekeliruan tanggal dapat segera disadari saat melihat penanggalan. Sebaliknya, pada gangguan neurokognitif, penderita sering kali kehilangan persepsi kesinambungan waktu secara menyeluruh.\n\n"
            "Mamasang jam dinding berangka besar dan kalender dengan penanda harian yang kontras di rumah dapat sangat membantu menjaga orientasi penderita."
        )
    },
    {
        "intent": "voice_gejala_006",
        "category": "gejala_kognitif",
        "pattern": "kesulitan menghitung uang kembalian, sulit mengatur keuangan, keliru berhitung",
        "response": (
            "Kesulitan berhitung atau mengelola transaksi finansial sederhana menunjukkan adanya penurunan pada fungsi eksekutif lobus frontal otak.\n\n"
            "Fungsi eksekutif mengatur kemampuan merencanakan, memecahkan masalah angka, serta menjaga konsentrasi berurutan. Penurunan di area ini sering membuat penderita rentan terhadap kekeliruan membayar atau risiko penipuan finansial.\n\n"
            "Sangat disarankan agar anggota keluarga mulai mendampingi pengelolaan transaksi perbankan dan pembayaran tagihan rutin secara bijaksana."
        )
    },
    {
        "intent": "voice_gejala_007",
        "category": "gejala_kognitif",
        "pattern": "apakah lupa nama cucu atau anak itu normal, lupa nama kerabat dekat",
        "response": (
            "Lupa sesaat terhadap nama kenalan jauh masih wajar, namun melupakan nama anak kandung, pasangan, atau cucu dekat merupakan tanda yang memerlukan evaluasi klinis mendalam.\n\n"
            "Memori relasional keluarga tersimpan di jaringan saraf yang sangat kokoh. Ketika memori tersebut mulai terganggu, hal ini mengindikasikan bahwa proses neurodegenerasi telah melibatkan area representasi memori autobiografis jangka panjang.\n\n"
            "Sebaiknya hindari menguji atau mendesak penderita, dan gunakan bantuan album foto bertuliskan nama untuk memicu asosiasi memori secara lembut."
        )
    },
    {
        "intent": "voice_gejala_008",
        "category": "gejala_kognitif",
        "pattern": "sulit fokus saat membaca atau menonton tv, konsentrasi cepat buyar, perhatian mudah teralihkan",
        "response": (
            "Menurunnya rentang perhatian dan kesulitan mengikuti alur cerita buku atau acara televisi merupakan cerminan dari gangguan memori kerja (*working memory*).\n\n"
            "Kondisi ini dapat dipicu oleh proses neurodegeneratif dini, namun dapat pula diperberat oleh defisiensi vitamin B12, gangguan tidur apnea, atau fluktuasi hormon tiroid yang belum terdiagnosis.\n\n"
            "Pemeriksaan laboratorium penunjang sangat dianjurkan untuk menyingkirkan penyebab medis lain yang berpotensi dapat dipulihkan."
        )
    },
    {
        "intent": "voice_gejala_009",
        "category": "gejala_kognitif",
        "pattern": "keliru mengenali cermin, mengira bayangan di cermin orang lain, halusinasi cermin",
        "response": (
            "Kondisi tidak mengenali bayangan diri di cermin dan mengiranya sebagai orang asing dikenal dalam ilmu neurologi sebagai fenomena **tanda cermin (*mirror sign*)**.\n\n"
            "Fenomena ini berkaitan dengan agnosia visual dan disfungsi pemrosesan persepsi diri di korteks parieto-oksipital, yang umumnya dijumpai pada stadium demensia sedang menuju lanjut.\n\n"
            "Bila bayangan tersebut memicu kecemasan atau kegelisahan pada penderita, sebaiknya tutupi cermin di kamar tidur dengan tirai tipis untuk menciptakan rasa aman."
        )
    },
    {
        "intent": "voice_gejala_010",
        "category": "gejala_kognitif",
        "pattern": "mengabaikan kebersihan diri, tidak mau mandi, malas menyisir rambut dan ganti baju",
        "response": (
            "Penurunan inisiatif merawat kebersihan diri, seperti enggan mandi atau berganti pakaian, sering berakar dari kombinasi apati dan hilangnya memori prosedural harian.\n\n"
            "Penderita mungkin lupa urutan langkah membersihkan tubuh atau merasa cemas terhadap sensasi air dan suhu dingin di kamar mandi, bukan sekadar penolakan yang disengaja.\n\n"
            "Pendekatan terbaik adalah dengan menyiapkan perlengkapan mandi secara berurutan, memastikan suhu air hangat yang nyaman, dan membimbing secara bertahap."
        )
    },
    {
        "intent": "voice_gejala_011",
        "category": "gejala_kognitif",
        "pattern": "mudah tertipu rayuan atau sales, penilaian buruk, kehilangan logika pertimbangan",
        "response": (
            "Penurunan kemampuan memberikan penilaian rasional (*impaired judgment*) merupakan manifestasi penting dari kemunduran fungsi korteks prefrontal.\n\n"
            "Kondisi ini membuat penderita kehilangan kepekaan terhadap risiko bahaya, mudah mempercayai tawaran yang tidak masuk akal, atau memberikan uang secara cuma-cuma kepada orang yang tidak dikenal.\n\n"
            "Langkah proteksi hukum dan finansial secara kekeluargaan sangat krusial untuk melindungi aset dan martabat penderita sedini mungkin."
        )
    },
    {
        "intent": "voice_gejala_012",
        "category": "gejala_kognitif",
        "pattern": "sering lupa mematikan kompor gas, lupa mengunci pintu rumah, bahaya keamanan rumah",
        "response": (
            "Lupa mematikan kompor gas atau membiarkan pintu rumah terbuka tanpa terkunci merupakan sinyal bahaya keamanan lingkungan yang amat mendesak.\n\n"
            "Penurunan memori prospektif—yakni kemampuan mengingat rencana tindakan yang harus diselesaikan di waktu mendatang—dapat berisiko fatal bagi keselamatan seluruh penghuni rumah.\n\n"
            "Sangat direkomendasikan untuk memasang detektor gas dan asap otomatis, kompor berfitur pemutus otomatis, serta kunci pintu digital berkode."
        )
    },
    {
        "intent": "voice_gejala_013",
        "category": "gejala_kognitif",
        "pattern": "apakah ada perbedaan gejala pada usia muda dan usia tua, alzheimer usia muda, early onset",
        "response": (
            "Penyakit Alzheimer pada usia di bawah 65 tahun (*Young/Early-Onset Alzheimer's*) memiliki karakteristik presentasi klinis yang agak berbeda dibanding pada usia lanjut.\n\n"
            "Pada usia yang lebih muda, gejala awal kerap muncul dalam bentuk gangguan fungsi visual-spasial, kesulitan merencanakan pekerjaan kompleks, atau perubahan kepribadian yang mendahului keluhan memori berat.\n\n"
            "Faktor genetik familial yang diturunkan secara dominan sering kali memiliki kontribusi lebih kuat pada kelompok usia muda ini."
        )
    },
    {
        "intent": "voice_gejala_014",
        "category": "gejala_kognitif",
        "pattern": "keluarga saya curiga orang lain mencuri barangnya, paranoid mencurigai pembantu, menuduh tetangga",
        "response": (
            "Waham kecurigaan atau delusi pencurian (*delusion of theft*) adalah salah satu gejala neuropsikiatri yang sangat sering dialami pasien demensia.\n\n"
            "Ketika penderita lupa di mana menaruh perhiasan atau uangnya, otak mereka mencoba mengisi celah memori yang hilang dengan menciptakan penjelasan defensif bahwa ada orang lain yang mengambilnya.\n\n"
            "Hindari mendebat atau membuktikan bahwa mereka salah; cukup dengarkan dengan empati dan ajak mereka mencari bersama ke tempat-tempat yang biasa dijadikan penyimpanan rahasia."
        )
    },
    {
        "intent": "voice_gejala_015",
        "category": "gejala_kognitif",
        "pattern": "apa tanda-tanda tahap awal menuju tahap sedang alzheimer, perkembangan stadium",
        "response": (
            "Transisi dari stadium ringan ke stadium sedang biasanya ditandai dengan semakin meluasnya hambatan kemandirian dalam aktivitas sehari-hari.\n\n"
            "Tanda-tanda utamanya meliputi meningkatnya kebingungan terhadap waktu dan tempat, kesulitan memilih pakaian yang sesuai musim atau acara, gangguan tidur, serta munculnya perubahan suasana hati seperti mudah cemas atau gelisah.\n\n"
            "Pencatatan perkembangan gejala harian secara berkala akan sangat bernilai bagi dokter neurologi dalam menyesuaikan intervensi farmakologis dan terapi kognitif."
        )
    },

    # =========================================================================
    # KELOMPOK 3: TES KOGNITIF MMSE, MOCA & SKOR KLINIS (10 Data)
    # =========================================================================
    {
        "intent": "voice_mmse_001",
        "category": "tes_kognitif",
        "pattern": "apa itu tes mmse, jelaskan pemeriksaan mmse, tes mini mental",
        "response": (
            "**Mini-Mental State Examination (MMSE)** adalah instrumen skrining kognitif standar emas berdurasi singkat yang digunakan secara global oleh dokter saraf dan geriatri.\n\n"
            "Tes ini memiliki skor total maksimal 30 poin, yang menilai lima fungsi kognitif fundamental: orientasi waktu dan tempat, registrasi memori seketika, atensi dan kalkulasi serial, mengingat kembali (*recall*), serta fungsi bahasa dan konstruksi motorik.\n\n"
            "Skor MMSE di bawah 24 umumnya mengindikasikan perlunya pemeriksaan lanjutan terhadap kemungkinan gangguan fungsi kognitif."
        )
    },
    {
        "intent": "voice_mmse_002",
        "category": "tes_kognitif",
        "pattern": "skor mmse 28 artinya apa, hasil tes mmse 27, apakah skor 29 normal",
        "response": (
            "Skor MMSE pada rentang 27 hingga 30 poin dikategorikan sebagai fungsi kognitif yang berada dalam batas **normal dan baik**.\n\n"
            "Meskipun skor angka menunjukkan hasil optimal, apabila pasien atau keluarga tetap merasakan adanya penurunan daya ingat yang signifikan dalam kehidupan sehari-hari, evaluasi instrumen yang lebih sensitif seperti tes MoCA tetap dapat dipertimbangkan.\n\n"
            "Pertahankan pola hidup sehat untuk otak dan lakukan pemeriksaan kognitif pembanding secara berkala setiap tahun."
        )
    },
    {
        "intent": "voice_mmse_003",
        "category": "tes_kognitif",
        "pattern": "skor mmse 22 artinya apa, skor mmse 20 sampai 23, gangguan kognitif ringan mmse",
        "response": (
            "Skor MMSE antara 20 hingga 23 poin mengindikasikan adanya **gangguan fungsi kognitif tingkat ringan (*Mild Cognitive Impairment* / demensia ringan)**.\n\n"
            "Pada rentang ini, individu biasanya masih mampu melakukan sebagian besar perawatan fisik pribadi, namun mulai membutuhkan bantuan dalam aktivitas kompleks seperti administrasi keuangan, navigasi jalan baru, atau kepatuhan minum obat.\n\n"
            "Sangat disarankan segera berkonsultasi dengan dokter spesialis neurologi untuk mengidentifikasi etiologi spesifik dan memulai terapi dini."
        )
    },
    {
        "intent": "voice_mmse_004",
        "category": "tes_kognitif",
        "pattern": "skor mmse 15 artinya apa, skor mmse 12 sampai 18, demensia sedang mmse",
        "response": (
            "Skor MMSE pada rentang 10 hingga 19 poin mencerminkan kondisi **demensia tingkat sedang (*moderate cognitive impairment*)**.\n\n"
            "Pada tahap ini, gangguan memori dan orientasi telah mempengaruhi kemandirian hidup sehari-hari secara nyata, dan penderita membutuhkan pendampingan aktif dari pengasuh (*caregiver*) untuk memastikan keselamatan dan kenyamanan.\n\n"
            "Pendekatan manajemen terpadu yang mencakup modifikasi lingkungan rumah, stimulasi kognitif ramah lansia, dan penanganan gejala perilaku menjadi prioritas utama."
        )
    },
    {
        "intent": "voice_mmse_005",
        "category": "tes_kognitif",
        "pattern": "skor mmse di bawah 10, skor mmse 8, demensia berat skor mmse",
        "response": (
            "Skor MMSE di bawah 10 poin menunjukkan stadium **demensia tingkat lanjut atau berat (*severe impairment*)**.\n\n"
            "Pada fase ini, kemampuan komunikasi verbal menjadi sangat terbatas dan penderita bergantung sepenuhnya pada bantuan orang lain untuk makan, berpakaian, berpindah, dan mandi.\n\n"
            "Fokus perawatan klinis bergeser pada perawatan paliatif suportif, pencegahan komplikasi fisik seperti luka tekan (*dekubitus*) atau infeksi paru, serta menjaga kenyamanan emosional penderita."
        )
    },
    {
        "intent": "voice_mmse_006",
        "category": "tes_kognitif",
        "pattern": "apa beda tes mmse dan moca, tes moca kognitif, montreal cognitive assessment",
        "response": (
            "Meskipun keduanya bernilai maksimal 30 poin, **MoCA (Montreal Cognitive Assessment)** dirancang dengan sensitivitas yang jauh lebih tinggi untuk mendeteksi *Mild Cognitive Impairment* (MCI) stadium sangat awal.\n\n"
            "MoCA menguji fungsi eksekutif, kemampuan visuospasial (seperti uji menggambar jam dinding dan meniru kubus 3D), serta memori asosiatif secara lebih mendalam dibanding MMSE yang lebih fokus pada fungsi orientasi dan memori verbal.\n\n"
            "Dokter saraf sering kali memilih MoCA apabila pasien memiliki tingkat pendidikan tinggi namun mulai mengeluhkan gangguan ketajaman berpikir."
        )
    },
    {
        "intent": "voice_mmse_007",
        "category": "tes_kognitif",
        "pattern": "apa itu tes menggambar jam dinding, clock drawing test, uji jam cdt",
        "response": (
            "**Clock Drawing Test (CDT)** adalah tes kognitif sederhana namun sangat kuat yang meminta pasien menggambar lingkaran jam lengkap dengan angka dan jarum yang menunjuk pukul tertentu (misal 11 lewat 10 menit).\n\n"
            "Uji ini secara simultan mengevaluasi pemahaman auditorik, memori jangka panjang, perencanaan spasial, serta fungsi kontrol eksekutif otak kanan dan lobus parietal.\n\n"
            "Ketidakmampuan menyusun angka secara proporsional atau salah meletakkan jarum jam merupakan indikator visual kuat adanya disfungsi kognitif struktural."
        )
    },
    {
        "intent": "voice_mmse_008",
        "category": "tes_kognitif",
        "pattern": "apakah tingkat pendidikan mempengaruhi hasil tes mmse, bias pendidikan mmse",
        "response": (
            "Ya, tingkat pendidikan formal terbukti secara ilmiah dapat mempengaruhi skor pencapaian tes MMSE dan MoCA.\n\n"
            "Individu dengan pendidikan tinggi sering kali memiliki cadangan kognitif (*cognitive reserve*) yang memungkinkan mereka menutupi penurunan kognitif awal pada tes skrining dasar, sedangkan individu dengan pendidikan dasar berisiko memperoleh skor lebih rendah secara semu.\n\n"
            "Oleh sebab itu, dokter saraf selalu melakukan penyesuaian interpretasi skor (*education-adjusted cutoff*) agar kesimpulan klinis yang diambil tepat dan adil."
        )
    },
    {
        "intent": "voice_mmse_009",
        "category": "tes_kognitif",
        "pattern": "berapa sering tes kognitif harus diulang, jadwal evaluasi kognitif berkala",
        "response": (
            "Untuk pemantauan perkembangan kognitif, evaluasi tes standar umumnya direkomendasikan untuk diulang setiap **6 hingga 12 bulan sekali**.\n\n"
            "Pengulangan dengan jeda yang wajar diperlukan untuk mengukur laju progresi penyakit, menilai efektivitas terapi obat yang diberikan, serta menghindari efek hafalan (*practice effect*) yang dapat mengaburkan hasil tes sesungguhnya.\n\n"
            "Bila Anda mencatat adanya kemunduran mendadak dalam hitungan hari atau minggu, segera periksakan pasien tanpa harus menunggu jadwal rutin."
        )
    },
    {
        "intent": "voice_mmse_010",
        "category": "tes_kognitif",
        "pattern": "apakah tes mmse bisa mendiagnosis alzheimer secara pasti, apakah mmse vonis pasti",
        "response": (
            "Penting untuk ditegaskan bahwa tes MMSE adalah **alat skrining awal**, bukan diagnosis definitif tunggal penyakit Alzheimer.\n\n"
            "Skor yang rendah menunjukkan adanya gangguan kognitif objektif, namun penyebabnya harus dikonfirmasi melalui wawancara klinis menyeluruh, penelusuran riwayat medis, pemeriksaan MRI/CT-scan otak, dan tes biomarker laboratorium.\n\n"
            "Hasil tes ini memberikan peta arah yang berharga bagi dokter untuk menentukan rangkaian investigasi medis selanjutnya."
        )
    },

    # =========================================================================
    # KELOMPOK 4: KEMANDIRIAN HARIAN (ADL / IADL) & FUNGSIONAL (10 Data)
    # =========================================================================
    {
        "intent": "voice_adl_001",
        "category": "kemandirian_adl",
        "pattern": "apa itu skor adl, apa arti adl, activities of daily living",
        "response": (
            "**Activities of Daily Living (ADL)** adalah ukuran klinis standar untuk menilai tingkat kemandirian fisik fungsional seseorang dalam merawat diri sehari-hari.\n\n"
            "ADL mencakup 6 fungsi biologis dasar: kemampuan makan mandiri, kontinensia (menahan buang air), kemampuan ke toilet, mobilitas berpindah tempat, mengenakan pakaian, dan mandi secara bersih.\n\n"
            "Dalam model prediksi Neura, skor ADL yang optimal berkorelasi kuat dengan rendahnya ketergantungan perawatan dan kualitas hidup kognitif yang lebih stabil."
        )
    },
    {
        "intent": "voice_adl_002",
        "category": "kemandirian_adl",
        "pattern": "apa beda adl dan iadl, instrumental adl, aktivitas instrumental",
        "response": (
            "Perbedaan mendasar terletak pada tingkat kompleksitas kognitif yang dibutuhkan untuk menjalankan aktivitas tersebut.\n\n"
            "**Basic ADL** mencakup fungsi bertahan hidup dasar seperti makan dan mandi, sedangkan **Instrumental ADL (IADL)** mencakup tugas sosial kompleks seperti memasak, mengelola keuangan, berbelanja, menggunakan gawai telepon, dan minum obat teratur.\n\n"
            "Pada penyakit Alzheimer, penurunan fungsi IADL hampir selalu terjadi jauh lebih awal sebelum kemunduran pada Basic ADL tampak nyata."
        )
    },
    {
        "intent": "voice_adl_003",
        "category": "kemandirian_adl",
        "pattern": "orang tua lupa cara memasang kancing baju, keliru urutan pakai pakaian, apraksia berpakaian",
        "response": (
            "Kesulitan menyusun urutan memakai pakaian, seperti mengenakan pakaian dalam di luar celana atau salah mengancingkan baju, dikenal sebagai **apraksia berpakaian (*dressing apraxia*)**.\n\n"
            "Kondisi ini disebabkan oleh terganggunya persepsi tubuh terhadap ruang dan hilangnya rencana gerak motorik di lobus parietal non-dominan otak.\n\n"
            "Solusi praktis yang dianjurkan adalah menata pakaian di tempat tidur sesuai urutan pemakaian dari kiri ke kanan dan memilih pakaian berkancing velcro atau berpinggang karet elastis."
        )
    },
    {
        "intent": "voice_adl_004",
        "category": "kemandirian_adl",
        "pattern": "keliru jadwal minum obat, sering dobel minum obat, kepatuhan minum obat lansia",
        "response": (
            "Kekeliruan jadwal minum obat atau meminum dosis ganda adalah risiko berbahaya yang sangat sering dialami lansia dengan gangguan memori prospektif.\n\n"
            "Overdosis obat antihipertensi, antidiabetes, atau obat jantung akibat lupa dapat memicu syok, penurunan kesadaran, hingga komplikasi gawat darurat.\n\n"
            "Gunakan kotak obat bersekat harian (*pill organizer*) dengan penanda pagi-siang-malam, dan pastikan pemberian obat diawasi langsung oleh anggota keluarga atau pendamping."
        )
    },
    {
        "intent": "voice_adl_005",
        "category": "kemandirian_adl",
        "pattern": "sering ngompol tiba-tiba, inkontinensia urin demensia, tidak sempat ke toilet",
        "response": (
            "Inkontinensia urin pada demensia dapat bersumber dari ketidakmampuan mengenali sinyal kandung kemih, lupa letak toilet, atau keterlambatan membuka kancing celana.\n\n"
            "Dalam istilah medis, ini sering digolongkan sebagai inkontinensia fungsional, di mana organ saluran kemih sebenarnya sehat namun jalur perintah kognitif motoriknya terhambat.\n\n"
            "Menerapkan jadwal buang air rutin setiap 2 hingga 3 jam sekali dan memasang tanda gambar toilet yang terang di pintu kamar mandi terbukti sangat efektif mengurangi insiden ini."
        )
    },
    {
        "intent": "voice_adl_006",
        "category": "kemandirian_adl",
        "pattern": "orang tua menolak makan, nafsu makan turun drastis, lupa sudah makan atau belum",
        "response": (
            "Gangguan pola makan pada demensia dapat berupa lupa bahwa dirinya baru saja makan, atau sebaliknya kehilangan nafsu makan akibat penurunan indra penciuman dan pengecap.\n\n"
            "Pada beberapa kasus, kesulitan mengunyah atau menelan (*disfagia*) juga membuat penderita enggan menghabiskan porsi makanan mereka.\n\n"
            "Sajikan makanan dalam piring berwarna kontras dengan tekstur lembut yang mudah ditelan, serta ciptakan suasana makan yang tenang tanpa gangguan kebisingan televisi."
        )
    },
    {
        "intent": "voice_adl_007",
        "category": "kemandirian_adl",
        "pattern": "lansia sering tersandung dan jatuh di rumah, risiko jatuh lansia, keseimbangan buruk",
        "response": (
            "Risiko jatuh pada penderita Alzheimer meningkat signifikan karena penurunan persepsi kedalaman visual, ketidakstabilan langkah motorik, dan efek samping obat sedatif.\n\n"
            "Jatuh pada lansia berpotensi mengakibatkan cedera serius seperti fraktur tulang panggul yang dapat mempercepat kemunduran fisik dan mental secara drastis.\n\n"
            "Modifikasi rumah sangat esensial: singkirkan karpet licin, pasang pegangan tangan (*grab bars*) di kamar mandi, dan pastikan lorong serta tangga memiliki pencahayaan terang."
        )
    },
    {
        "intent": "voice_adl_008",
        "category": "kemandirian_adl",
        "pattern": "apakah masih boleh mengemudi mobil atau motor, lansia menyetir kendaraan",
        "response": (
            "Mengemudi menuntut integrasi reaksi visual kilat, koordinasi motorik kaki-tangan yang presisi, dan pengambilan keputusan navigasi yang cepat.\n\n"
            "Pada individu yang terdiagnosis Alzheimer meskipun tahap awal, kemampuan merespons rem mendadak atau mengenali rambu lalu lintas menurun secara signifikan, sehingga sangat membahayakan diri sendiri dan pengguna jalan lain.\n\n"
            "Keluarga dianjurkan berdiskusi secara bijak dan penuh kasih untuk mengalihkan peran mengemudi kepada keluarga atau menggunakan transportasi publik yang didampingi."
        )
    },
    {
        "intent": "voice_adl_009",
        "category": "kemandirian_adl",
        "pattern": "bagaimana cara melatih kemandirian tanpa membuat lansia merasa direndahkan, memelihara martabat",
        "response": (
            "Kunci utama pemberdayaan fungsional lansia adalah memberikan bantuan minimal yang diperlukan (*assisted independence*) tanpa mengambil alih seluruh tugas mereka.\n\n"
            "Biarkan mereka melakukan bagian yang masih mampu dikerjakan sendiri, misalnya memegang sendok atau memilih baju dari dua opsi sederhana yang Anda siapkan.\n\n"
            "Pendekatan ini memelihara harga diri, merangsang neuron motorik tetap aktif, dan mencegah timbulnya rasa tidak berdaya yang berujung pada depresi."
        )
    },
    {
        "intent": "voice_adl_010",
        "category": "kemandirian_adl",
        "pattern": "skor functional assessment apa maksudnya, penilaian fungsional fa",
        "response": (
            "Parameter **Functional Assessment** dalam sistem klinis Neura mengukur derajat efisiensi dan adaptasi seseorang dalam berinteraksi dengan lingkungan sosial dan fisiknya.\n\n"
            "Skor ini menggabungkan penilaian terhadap mobilitas, kemandirian instrumen harian, serta kapasitas pemecahan masalah sederhana saat menghadapi situasi darurat.\n\n"
            "Skor fungsional yang stabil merupakan indikasi positif bahwa kualitas penanganan dan lingkungan tempat tinggal pasien bekerja secara efektif."
        )
    },

    # =========================================================================
    # KELOMPOK 5: GEJALA PERILAKU, PSIKOLOGIS & SUNDOWNING (10 Data)
    # =========================================================================
    {
        "intent": "voice_bpsd_001",
        "category": "gejala_perilaku",
        "pattern": "apa itu sundowning syndrome, lansia gelisah saat matahari terbenam, rewel sore hari",
        "response": (
            "**Sundowning Syndrome** adalah fenomena klinis di mana penderita demensia mengalami peningkatan kebingungan, kecemasan, dan kegelisahan saat sore menjelang malam hari.\n\n"
            "Pemicu utamanya adalah gangguan ritme sirkadian internal otak, kelelahan mental setelah beraktivitas seharian, serta memudarnya cahaya alami yang mempertegas bayangan di dalam rumah.\n\n"
            "Nyalakan lampu ruangan lebih awal sebelum senja tiba, putar musik relaksasi yang tenang, dan hindari minuman berkafein di sore hari untuk meredakan gejala ini."
        )
    },
    {
        "intent": "voice_bpsd_002",
        "category": "gejala_perilaku",
        "pattern": "orang tua sering marah-marah tanpa sebab, agresi emosional demensia, membentak tiba-tiba",
        "response": (
            "Ledakan emosi atau agresi verbal pada penderita Alzheimer jarang terjadi tanpa alasan; kondisi ini hampir selalu merupakan respons frustrasi terhadap rasa takut atau ketidaknyamanan fisik.\n\n"
            "Karena keterbatasan kosakata, penderita mungkin tidak mampu mengungkapkan rasa nyeri lambung, sakit gigi, pakaian yang sempit, atau rasa lelah yang luar biasa.\n\n"
            "Tetaplah bersikap tenang, gunakan nada bicara rendah dan menenangkan, serta periksa kenyamanan fisik pasien daripada membalas kemarahan mereka."
        )
    },
    {
        "intent": "voice_bpsd_003",
        "category": "gejala_perilaku",
        "pattern": "merasa ingin pulang ke rumah padahal sudah di rumah sendiri, mencari rumah masa kecil",
        "response": (
            "Permintaan 'ingin pulang' sangat umum dijumpai, di mana kata 'rumah' bagi penderita sering melambangkan memori masa muda saat mereka merasa paling aman dan memiliki kendali.\n\n"
            "Mendebat dengan mengatakan 'ini kan rumahmu sendiri' justru akan memicu kebingungan dan kepanikan karena memori visual rumah saat ini tidak cocok dengan memori emosional di kepalanya.\n\n"
            "Katakan secara menenangkan: 'Kita aman di sini malam ini, besok pagi kita bisa keluar berjalan-jalan', lalu alihkan perhatian dengan teh hangat atau album kenangan."
        )
    },
    {
        "intent": "voice_bpsd_004",
        "category": "gejala_perilaku",
        "pattern": "lansia berjalan mondar-mandir tanpa tujuan, wandering demensia, suka keluyuran",
        "response": (
            "Perilaku mondar-mandir (*wandering*) sering dipicu oleh rasa bosan, dorongan mencari sesuatu yang hilang, atau keinginan melepaskan kelebihan energi fisik.\n\n"
            "Bahaya utama dari perilaku ini adalah risiko tersesat atau mengalami kecelakaan di luar rumah tanpa disadari oleh keluarga.\n\n"
            "Solusi pencegahannya meliputi mengajak jalan santai teratur di pagi hari, memasang kunci pengaman tambahan di pintu gerbang yang tidak mencolok, dan mengenakan gelang penanda identitas."
        )
    },
    {
        "intent": "voice_bpsd_005",
        "category": "gejala_perilaku",
        "pattern": "melihat bayangan orang yang sudah meninggal, halusinasi visual lansia, halusinasi demensia",
        "response": (
            "Halusinasi visual—seperti melihat kerabat yang sudah lama wafat atau hewan peliharaan masa kecil—disebabkan oleh kekeliruan sirkuit saraf di korteks asosiasi visual.\n\n"
            "Apabila halusinasi tersebut tidak membuat pasien merasa takut atau terancam, Anda tidak perlu membantahnya secara keras; cukup berikan rasa aman dan alihkan perhatiannya.\n\n"
            "Namun, bila halusinasi menimbulkan kepanikan atau ketakutan hebat, segera laporkan ke dokter saraf untuk evaluasi penyesuaian medikasi."
        )
    },
    {
        "intent": "voice_bpsd_006",
        "category": "gejala_perilaku",
        "pattern": "menimbun barang bekas, menyembunyikan makanan di lemari baju, perilaku hoarding",
        "response": (
            "Menimbun sampah, koran lama, atau menyembunyikan makanan basi di laci pakaian (*hoarding behavior*) berakar dari rasa cemas kehilangan kepemilikan dan rasa aman.\n\n"
            "Mengambil barang-barang tersebut secara paksa di depan mata pasien dapat menimbulkan kemarahan dan kecurigaan yang intens.\n\n"
            "Bersihkan tempat penyimpanan secara bertahap dan rahasia saat pasien sedang mandi atau beraktivitas lain, dan sisakan barang-barang yang aman agar mereka tetap merasa memiliki kendali."
        )
    },
    {
        "intent": "voice_bpsd_007",
        "category": "gejala_perilaku",
        "pattern": "kehilangan minat hobi, apatis total, hanya melamun sepanjang hari",
        "response": (
            "Apati klinis ditandai dengan hilangnya inisiatif, penurunan respons emosi terhadap kabar gembira atau duka, serta penghentian hobi yang sebelumnya sangat dicintai.\n\n"
            "Apati berbeda dari depresi; apati pada Alzheimer berkaitan langsung dengan hipometabolisme di area korteks cingulata anterior dan ganglia basalis.\n\n"
            "Bantu rangsang keterlibatan penderita dengan mengajak melakukan aktivitas sensori sederhana tanpa beban target, seperti merawat tanaman hias, mengelus hewan peliharaan, atau mendengarkan lagu nostalgia."
        )
    },
    {
        "intent": "voice_bpsd_008",
        "category": "gejala_perilaku",
        "pattern": "gangguan tidur malam parah, bangun tengah malam masak atau beres-beres, insomnia demensia",
        "response": (
            "Inversi ritme tidur—yakni tidur sepanjang siang hari dan terjaga aktif di tengah malam—terjadi akibat degenerasi nukleus suprakiasmatik di hipotalamus yang mengatur jam biologis tubuh.\n\n"
            "Kondisi ini sangat menguras energi fisik pengasuh keluarga jika tidak ditangani dengan strategi higiene tidur yang sistematis.\n\n"
            "Maksimalkan paparan sinar matahari pagi selama 30 menit, batasi tidur siang tidak lebih dari 30 menit, dan ciptakan rutinitas relaksasi sebelum waktu tidur malam tiba."
        )
    },
    {
        "intent": "voice_bpsd_009",
        "category": "gejala_perilaku",
        "pattern": "tertawa atau menangis tiba-tiba tanpa pemicu, ketidakstabilan emosi pseudobulbar",
        "response": (
            "Emosi yang meledak tiba-tiba antara tertawa dan menangis tanpa stimulus yang sesuai dapat mencerminkan gangguan regulasi afek (*Pseudobulbar Affect*).\n\n"
            "Kondisi ini terjadi ketika koneksi saraf antara korteks serebri yang mengendalikan emosi dan pusat ekspresi batang otak mengalami diskoneksi akibat lesi mikrovaskular atau neurodegenerasi.\n\n"
            "Sikap terbaik adalah dengan tidak menertawakan atau mengkritik reaksi tersebut, bersikap tenang, dan menunggu gelombang emosi mereda secara alami."
        )
    },
    {
        "intent": "voice_bpsd_010",
        "category": "gejala_perilaku",
        "pattern": "apa obat untuk menenangkan pasien alzheimer yang mengamuk, obat penenang demensia",
        "response": (
            "Penanganan pertama untuk kegelisahan atau amarah pada demensia selalu mengedepankan **intervensi non-farmakologis** lingkungan terlebih dahulu.\n\n"
            "Penggunaan obat penenang seperti antipsikotik atipikal atau sedatif harus diawasi secara sangat ketat oleh dokter spesialis neurologi atau psikiatri geriatri, karena berisiko meningkatkan efek samping mengantuk, jatuh, dan gangguan vaskular.\n\n"
            "Jangan pernah memberikan obat penenang tanpa resep dan evaluasi medis langsung dari dokter yang merawat."
        )
    },

    # =========================================================================
    # KELOMPOK 6: PENCEGAHAN, DIET MIND, LATIHAN OTAK & GAYA HIDUP (15 Data)
    # =========================================================================
    {
        "intent": "voice_cegah_001",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apa itu diet mind untuk alzheimer, pola makan pencegah pikun, nutrisi otak",
        "response": (
            "**Diet MIND** (*Mediterranean-DASH Intervention for Neurodegenerative Delay*) adalah pola nutrisi yang diformulasikan secara khusus untuk memperlambat penuaan kognitif dan menurunkan risiko Alzheimer.\n\n"
            "Diet ini menitikberatkan pada konsumsi sayuran berdaun hijau gelap, buah beri kaya antioksidan (seperti blueberry dan stroberi), kacang-kacangan, biji-bijian utuh, minyak zaitun murni, serta ikan kaya omega-3.\n\n"
            "Secara bersamaan, asupan daging merah berlemak, mentega, keju olahan, makanan cepat saji, dan gula berlebih sangat dibatasi untuk meminimalkan peradangan sel saraf."
        )
    },
    {
        "intent": "voice_cegah_002",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah olahraga fisik bisa mencegah alzheimer, manfaat olahraga untuk otak",
        "response": (
            "Aktivitas fisik aerobik teratur merupakan salah satu pilar intervensi non-obat paling efektif untuk menjaga integritas volume hipokampus otak.\n\n"
            "Olahraga aerobik intensitas sedang seperti jalan cepat, berenang, atau bersepeda selama minimal 150 menit per minggu terbukti merangsang pelepasan **BDNF (*Brain-Derived Neurotrophic Factor*)** yang memicu pembentukan sinaps saraf baru.\n\n"
            "Selain itu, olahraga memperbaiki elastisitas pembuluh darah otak dan memperlancar aliran oksigen ke jaringan saraf."
        )
    },
    {
        "intent": "voice_cegah_003",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah main catur atau teka-teki silang tts berguna, senam otak, latihan kognitif",
        "response": (
            "Aktivitas stimulasi kognitif seperti bermain catur, mengisi TTS, membaca buku bermutu, atau belajar memainkan alat musik baru sangat bermanfaat memperkaya **cadangan kognitif (*cognitive reserve*)**.\n\n"
            "Cadangan kognitif yang kuat bertindak sebagai bantalan pelindung yang memungkinkan jaringan otak mengalihkan fungsi berpikir melalui jalur sinaps alternatif saat jalur utama mengalami kerusakan.\n\n"
            "Prinsip terpenting adalah variasi dan tantangan baru; pilihlah aktivitas yang menuntut proses belajar baru secara berkelanjutan."
        )
    },
    {
        "intent": "voice_cegah_004",
        "category": "gaya_hidup_pencegahan",
        "pattern": "berapa jam tidur malam yang ideal untuk kesehatan otak, tidur cukup mencegah amiloid",
        "response": (
            "Durasi tidur malam yang ideal untuk orang dewasa dan lansia adalah berkisar antara **7 hingga 8 jam** dengan kualitas tidur yang lelap dan berkesinambungan.\n\n"
            "Fase tidur gelombang lambat (*Slow-Wave Sleep*) mengaktifkan mekanisme pembersihan biologis sistem glimfatik, yang mengalirkan cairan serebrospinal untuk membilas plak protein beta-amiloid dan tau dari ruang antarsel otak.\n\n"
            "Kurang tidur kronis terbukti meningkatkan akumulasi biomarker patologis pemicu demensia."
        )
    },
    {
        "intent": "voice_cegah_005",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah stres kronis bisa memicu alzheimer, pengaruh depresi pada memori",
        "response": (
            "Stres psikologis berkepanjangan memicu pelepasan hormon kortisol tingkat tinggi secara terus-menerus ke dalam sirkulasi darah.\n\n"
            "Tingginya kadar kortisol dalam jangka panjang bersifat neurotoksik dan dapat memicu atrofi atau penyusutan neuron di hipokampus, pusat penyimpanan memori baru.\n\n"
            "Praktik manajemen stres seperti meditasi pernapasan dalam, beribadah dengan khusyuk, dan menjaga interaksi sosial hangat terbukti melindungi kesehatan sirkuit saraf otak."
        )
    },
    {
        "intent": "voice_cegah_006",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah berhenti merokok membantu mencegah kepikunan, rokok dan risiko alzheimer",
        "response": (
            "Berhenti merokok memberikan proteksi vaskular dan kognitif yang luar biasa besar bagi kesehatan jaringan otak.\n\n"
            "Zat racun dalam asap rokok menimbulkan stres oksidatif masif, merusak dinding endotel pembuluh darah mikro otak, dan melipatgandakan risiko aterosklerosis serebral yang memicu stroke mini maupun Alzheimer.\n\n"
            "Menghentikan kebiasaan merokok dapat segera memperbaiki oksigenasi jaringan otak dan menurunkan laju penurunan fungsi kognitif seiring usia."
        )
    },
    {
        "intent": "voice_cegah_007",
        "category": "gaya_hidup_pencegahan",
        "pattern": "bagaimana hubungan diabetes gula darah dengan alzheimer, diabetes tipe 3",
        "response": (
            "Korelasi antara diabetes melitus tipe 2 dan penyakit Alzheimer sangat erat, sampai-sampai sebagian peneliti medis menjulukinya sebagai fenomena **Diabetes Tipe 3**.\n\n"
            "Resistensi insulin di jaringan otak mengganggu kemampuan sel saraf menyerap glukosa sebagai sumber energi utama, sekaligus menghambat enzim pembersih protein amiloid (*Insulin-Degrading Enzyme*).\n\n"
            "Mengendalikan kadar gula darah (target HbA1c stabil) dan menerapkan pola makan indeks glikemik rendah merupakan langkah pencegahan demensia yang sangat vital."
        )
    },
    {
        "intent": "voice_cegah_008",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah tekanan darah tinggi bisa membuat cepat pikun, hipertensi dan demensia",
        "response": (
            "Hipertensi kronis yang tidak terkontrol, terutama yang terjadi pada usia paruh baya (40–60 tahun), merupakan salah satu faktor risiko vaskular utama penyebab demensia.\n\n"
            "Tekanan darah tinggi merusak pembuluh darah kapiler yang memberi makan substansia alba otak, memicu infark lakunar kecil (*silent stroke*), dan mempercepat penumpukan amiloid.\n\n"
            "Menjaga tekanan darah sistolik di bawah 130 mmHg melalui pola makan rendah natrium dan terapi antihipertensi terbukti efektif melindungi fungsi memori."
        )
    },
    {
        "intent": "voice_cegah_009",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah gangguan pendengaran bisa memicu demensia, pengaruh tuli atau kurang dengar",
        "response": (
            "Laporan komisi medis internasional *The Lancet* menegaskan bahwa gangguan pendengaran usia paruh baya yang tidak dikoreksi adalah salah satu faktor risiko demensia terbesar yang dapat dimodifikasi.\n\n"
            "Ketika input auditorik berkurang, otak harus mengalihkan sumber daya kognitif ekstra hanya untuk memproses suara, yang mempercepat atrofi lobus temporal serta memicu isolasi sosial dan depresi.\n\n"
            "Menggunakan alat bantu dengar (*hearing aid*) sedini mungkin terbukti ampuh mempertahankan ketajaman kognitif lansia secara signifikan."
        )
    },
    {
        "intent": "voice_cegah_010",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah suplemen otak ginkgo biloba atau omega 3 benar-benar ampuh, vitamin otak",
        "response": (
            "Bukti ilmiah terkini menunjukkan bahwa tidak ada suplemen tunggal dalam botol yang dapat mencegah atau menyembuhkan penyakit Alzheimer secara instan.\n\n"
            "Meskipun asam lemak Omega-3 (DHA/EPA), vitamin D, dan vitamin B kompleks penting untuk metabolisme sel saraf, manfaat terbaiknya diperoleh melalui pola makanan utuh (*whole foods*) dalam diet seimbang.\n\n"
            "Konsultasikan terlebih dahulu dengan dokter sebelum mengonsumsi suplemen dosis tinggi guna menghindari interaksi berbahaya dengan obat rutin lainnya."
        )
    },
    {
        "intent": "voice_cegah_011",
        "category": "gaya_hidup_pencegahan",
        "pattern": "manfaat interaksi sosial bagi lansia, mengobrol dengan teman mencegah pikun",
        "response": (
            "Menjaga interaksi sosial aktif dan bermakna memiliki dampak protektif yang setara dengan latihan intelektual intensif bagi otak lansia.\n\n"
            "Percakapan hangat, berdiskusi, dan tertawa bersama sahabat merangsang pelepasan neurotransmiter dopamin dan oksitosin, serta mengaktifkan sirkuit bahasa, empati, dan memori emosional secara serempak.\n\n"
            "Mendorong lansia bergabung dalam komunitas pengajian, klub senam lansia, atau perkumpulan hobi adalah investasi berharga untuk kebugaran kognitif mereka."
        )
    },
    {
        "intent": "voice_cegah_012",
        "category": "gaya_hidup_pencegahan",
        "pattern": "pengaruh konsumsi alkohol terhadap kesehatan otak, alkohol dan alzheimer",
        "response": (
            "Konsumsi alkohol berlebih secara kronis bersifat neurotoksik langsung terhadap neuron korteks serebri dan menyebabkan defisiensi tiamin (vitamin B1).\n\n"
            "Kondisi ini dapat memicu sindrom Wernicke-Korsakoff serta mempercepat timbulnya demensia alkoholik dan atrofi substansia alba otak.\n\n"
            "Membatasi atau sepenuhnya menghindari konsumsi minuman beralkohol adalah keputusan paling bijak untuk menjaga kejernihan pikiran jangka panjang."
        )
    },
    {
        "intent": "voice_cegah_013",
        "category": "gaya_hidup_pencegahan",
        "pattern": "bahaya cedera kepala atau gegar otak, trauma kepala dan alzheimer",
        "response": (
            "Riwayat cedera kepala traumatis (*Traumatic Brain Injury*), terutama yang disertai kehilangan kesadaran atau terjadi berulang kali, meningkatkan risiko neurodegenerasi di masa tua.\n\n"
            "Trauma fisik pada kepala dapat memicu kaskade peradangan saraf kronis dan mempercepat polimerisasi protein tau yang merusak akson sel saraf.\n\n"
            "Selalu kenakan helm pelindung saat berkendara roda dua atau berolahraga, dan pastikan lingkungan rumah aman dari bahaya benturan kepala."
        )
    },
    {
        "intent": "voice_cegah_014",
        "category": "gaya_hidup_pencegahan",
        "pattern": "kegiatan seni dan musik untuk stimulasi memori, terapi musik alzheimer",
        "response": (
            "Terapi musik dan aktivitas seni memiliki keistimewaan luar biasa karena jalur pemrosesan melodi dan ritme di otak relatif terlindungi lebih lama dari kerusakan demensia.\n\n"
            "Mendengarkan lagu-lagu kenangan masa muda dapat membangkitkan memori autobiografis emosional yang tertidur, meredakan kecemasan, dan memicu senyuman pada penderita.\n\n"
            "Aktivitas melukis atau mewarnai juga merangsang koordinasi motorik halus dan menjadi saluran komunikasi ekspresif non-verbal yang sangat menenangkan."
        )
    },
    {
        "intent": "voice_cegah_015",
        "category": "gaya_hidup_pencegahan",
        "pattern": "apakah ada obat herbal alami untuk mencegah pikun, kunyit jahe pegagan",
        "response": (
            "Senyawa alami seperti kurkumin pada kunyit dan ekstrak pegagan (*Centella asiatica*) memiliki sifat antiinflamasi dan antioksidan yang menjanjikan dalam riset laboratorium.\n\n"
            "Meskipun rempah-rempah tersebut sangat baik dikonsumsi sebagai bumbu masakan harian yang sehat, penggunaannya tidak boleh menggantikan terapi medis terstandar dari dokter saraf.\n\n"
            "Jadikan rempah alami sebagai bagian komplementer dari gaya hidup sehat holistik tanpa mengabaikan pemantauan klinis berkala."
        )
    },

    # =========================================================================
    # KELOMPOK 7: BIOMARKER MEDIS, PROFIL GENETIK & PEMERIKSAAN LAB (10 Data)
    # =========================================================================
    {
        "intent": "voice_biomarker_001",
        "category": "biomarker_dan_lab",
        "pattern": "apa itu plak beta amiloid dan protein tau, penyebab biologis alzheimer",
        "response": (
            "Secara patofisiologi biologis, penyakit Alzheimer ditandai oleh dua kelainan protein utama di dalam jaringan otak.\n\n"
            "Pertama adalah penumpukan **plak peptida Beta-Amiloid** di ruang ekstraseluler antarsel saraf yang menghambat transmisi sinyal kimia. Kedua adalah kekusutan neurofibrilar dari **protein Tau terfosforilasi** di dalam badan sel yang meruntuhkan struktur mikrotubulus penyokong neuron.\n\n"
            "Kombinasi kedua proses patologis ini berujung pada kematian sel saraf masif dan penyusutan volume otak."
        )
    },
    {
        "intent": "voice_biomarker_002",
        "category": "biomarker_dan_lab",
        "pattern": "apa itu gen apoe4, apakah alzheimer penyakit keturunan, faktor genetik alzheimer",
        "response": (
            "Apolipoprotein E varian epsilon 4 (**APOE-e4**) adalah faktor risiko genetik paling signifikan yang teridentifikasi untuk Alzheimer tipe sporadis pada usia lanjut.\n\n"
            "Memiliki satu atau dua salinan alel APOE-e4 meningkatkan kerentanan biologis terhadap penumpukan amiloid, namun gen ini adalah **faktor risiko kerentanan, bukan takdir mutlak** yang pasti menimbulkan penyakit.\n\n"
            "Banyak individu pembawa gen ini yang tetap sehat kognitif hingga usia senja berkat penerapan gaya hidup sehat protektif yang ketat."
        )
    },
    {
        "intent": "voice_biomarker_003",
        "category": "biomarker_dan_lab",
        "pattern": "apa peran mri otak dalam pemeriksaan alzheimer, ct scan kepala demensia",
        "response": (
            "Pemeriksaan **MRI Otak (Magnetic Resonance Imaging)** beresolusi tinggi merupakan modalitas pencitraan struktural standar dalam evaluasi diagnostik demensia.\n\n"
            "MRI bertujuan mengukur derajat atrofi spesifik di area hipokampus dan lobus temporal medial, serta mendeteksi adanya beban lesi mikrovaskular substansia alba.\n\n"
            "Selain itu, MRI krusial untuk menyingkirkan penyebab kepikunan lain yang dapat dioperasi, seperti tumor otak, hematoma subdural kronis, atau hidrosefalus tekanan normal."
        )
    },
    {
        "intent": "voice_biomarker_004",
        "category": "biomarker_dan_lab",
        "pattern": "apa itu pet scan amiloid, amyloid pet scan, pencitraan fungsional otak",
        "response": (
            "**Amyloid PET Scan** adalah teknologi pencitraan molekuler canggih yang menggunakan pelacak radiofarmaka khusus untuk memvisualisasikan persebaran plak amiloid di otak hidup secara langsung.\n\n"
            "Pemeriksaan ini memberikan konfirmasi objektif tingkat tinggi apakah patologi biologis Alzheimer sudah mulai terdeposit di korteks serebri, bahkan bertahun-tahun sebelum gejala klinis berat muncul.\n\n"
            "Pemeriksaan ini sangat bernilai dalam seleksi pasien untuk terapi antibodi monoklonal generasi baru."
        )
    },
    {
        "intent": "voice_biomarker_005",
        "category": "biomarker_dan_lab",
        "pattern": "apakah tes darah bisa mendeteksi alzheimer, biomarker darah p-tau217",
        "response": (
            "Perkembangan teknologi biomarker darah terkini, khususnya penanda **plasma p-tau217** dan rasio amiloid beta 42/40, telah merevolusi bidang diagnostik neurokognitif global.\n\n"
            "Tes darah inovatif ini memiliki akurasi korelasi yang sangat tinggi terhadap hasil PET scan dan pungsi lumbal, membuka peluang skrining awal yang cepat, terjangkau, dan non-invasif.\n\n"
            "Meskipun sangat menjanjikan, penggunaannya tetap harus diintegrasikan dengan evaluasi klinis dokter spesialis."
        )
    },
    {
        "intent": "voice_biomarker_006",
        "category": "biomarker_dan_lab",
        "pattern": "bagaimana pengaruh kolesterol ldl dan trigliserida terhadap otak, lipid profile",
        "response": (
            "Kadar kolesterol LDL dan trigliserida yang tinggi dalam darah berkontribusi langsung terhadap kekakuan dinding arteri dan proses aterosklerosis pembuluh darah serebrovaskular.\n\n"
            "Sirkulasi darah mikro otak yang terganggu oleh plak lipid mempercepat iskemia kronis jaringan saraf dan memfasilitasi pembentukan plak amiloid.\n\n"
            "Dalam 32 biomarker model Neura, keseimbangan profil lipid (termasuk nilai HDL pelindung) menjadi variabel penting penentu stabilitas skor risiko pasien."
        )
    },
    {
        "intent": "voice_biomarker_007",
        "category": "biomarker_dan_lab",
        "pattern": "apakah defisiensi vitamin b12 bisa menyebabkan pikun, asam folat dan memori",
        "response": (
            "Defisiensi **Vitamin B12 (Kobalamin)** dan asam folat adalah salah satu penyebab gangguan fungsi memori yang **bersifat reversibel (dapat disembuhkan)** bila ditangani tepat waktu.\n\n"
            "Kekurangan vitamin B12 merusak selubung mielin saraf dan meningkatkan kadar homosistein darah yang bersifat racun vaskular bagi sel otak.\n\n"
            "Pemeriksaan kadar vitamin B12 serum selalu menjadi prosedur wajib pertama yang dilakukan dokter saraf sebelum mendiagnosis demensia degeneratif."
        )
    },
    {
        "intent": "voice_biomarker_008",
        "category": "biomarker_dan_lab",
        "pattern": "pengaruh hormon tiroid hipotiroid pada daya ingat, tes tsh ft4",
        "response": (
            "Kondisi **hipotiroidisme** (penurunan hormon tiroid fT4 dengan peningkatan TSH) dapat memperlambat seluruh proses metabolisme seluler tubuh, termasuk kerja sistem saraf pusat.\n\n"
            "Pasien hipotiroid kerap menunjukkan gejala 'kabut otak' (*brain fog*), kelambatan berpikir, penurunan daya ingat, serta gejala mirip depresi.\n\n"
            "Koreksi kadar hormon tiroid melalui terapi sulih levotiroksin di bawah supervisi dokter sering kali memulihkan kejernihan kognitif pasien secara nyata."
        )
    },
    {
        "intent": "voice_biomarker_009",
        "category": "biomarker_dan_lab",
        "pattern": "apa itu pungsi lumbal pemeriksaan cairan otak csf, tes cairan sumsum tulang belakang",
        "response": (
            "Pungsi lumbal adalah prosedur pengambilan sampel cairan serebrospinal (CSF) melalui ruang antartulang belakang bagian pinggang bawah.\n\n"
            "Analisis laboratorium terhadap CSF mengukur konsentrasi protein Abeta-42, total tau, dan fosfo-tau sebagai tolok ukur definitif kelainan biokimiawi di dalam susunan saraf pusat.\n\n"
            "Prosedur ini dilakukan secara steril dan aman oleh dokter spesialis neurologi untuk kasus-kasus klinis yang memerlukan konfirmasi presisi tinggi."
        )
    },
    {
        "intent": "voice_biomarker_010",
        "category": "biomarker_dan_lab",
        "pattern": "bagaimana model xgboost neura mengolah 32 biomarker, akurasi prediksi neura",
        "response": (
            "Model pembelajaran mesin Neura mengadopsi algoritma **XGBoost (Extreme Gradient Boosting)** yang dilatih pada ribuan profil data klinis terstandardisasi internasional.\n\n"
            "Algoritma ini memetakan interaksi multi-faktor yang kompleks antara usia, profil lipid, tensi darah, skor MMSE, indeks ADL, keluhan memori, dan komorbiditas vaskular dengan akurasi validasi 95.3%.\n\n"
            "Hasil prediksi Neura memberikan estimasi probabilitas risiko awal yang objektif guna mempercepat deteksi dini sebelum kerusakan otak meluas."
        )
    },

    # =========================================================================
    # KELOMPOK 8: PANDUAN CAREGIVER, KOMUNIKASI & KEAMANAN RUMAH (15 Data)
    # =========================================================================
    {
        "intent": "voice_caregiver_001",
        "category": "panduan_caregiver",
        "pattern": "bagaimana cara berbicara dengan penderita alzheimer, tips komunikasi demensia",
        "response": (
            "Kunci utama komunikasi efektif dengan penderita demensia adalah berbicara dengan **kalimat pendek, nada suara tenang, dan tempo perlahan**.\n\n"
            "Selalu buat kontak mata hangat sejajar sebelum mulai berbicara, sebutkan nama penderita dengan santun, dan ajukan satu pertanyaan sederhana pada satu waktu agar tidak membebani pemrosesan informasi di otaknya.\n\n"
            "Berikan waktu jeda yang cukup bagi mereka untuk merespons tanpa dipotong atau disela secara terburu-buru."
        )
    },
    {
        "intent": "voice_caregiver_002",
        "category": "panduan_caregiver",
        "pattern": "apakah boleh membantah ucapan penderita alzheimer, jangan membantah lansia",
        "response": (
            "Prinsip etika emas dalam pendampingan demensia adalah **jangan pernah mendebat, mengoreksi kasar, atau memaksakan realitas logika** pada penderita.\n\n"
            "Memori penderita adalah realitas yang mereka rasakan nyata; membantah hanya akan memicu rasa terancam, panik, frustrasi mendalam, atau amarah defensif.\n\n"
            "Terapkan teknik validasi emosi terlebih dahulu, lalu alihkan percakapan (*validate and redirect*) secara halus ke topik yang membahagiakan."
        )
    },
    {
        "intent": "voice_caregiver_003",
        "category": "panduan_caregiver",
        "pattern": "saya merasa lelah dan stres merawat orang tua, burnout caregiver, depresi merawat lansia",
        "response": (
            "Kelelahan fisik dan emosional yang Anda rasakan adalah hal yang sangat manusiawi; merawat penderita demensia adalah salah satu peran hidup paling menantang di dunia.\n\n"
            "Sindrom *Caregiver Burnout* dapat membahayakan kesehatan mental dan imunitas tubuh Anda sendiri jika Anda menanggung seluruh beban pengasuhan sendirian tanpa jeda istirahat.\n\n"
            "Ingatlah prinsip keselamatan: Anda tidak dapat merawat orang lain dengan baik jika diri Anda sendiri tumbang. Carilah pembagian giliran dengan keluarga atau manfaatkan layanan *respite care*."
        )
    },
    {
        "intent": "voice_caregiver_004",
        "category": "panduan_caregiver",
        "pattern": "bagaimana modifikasi rumah agar aman untuk penderita alzheimer, home safety demensia",
        "response": (
            "Modifikasi lingkungan fisik rumah bertujuan menciptakan ruang tinggal yang ramah dan meminimalkan bahaya kecelakaan.\n\n"
            "Langkah prioritas meliputi: memastikan pencahayaan terang merata tanpa bayangan tajam, memasang pegangan besi di kamar mandi dan kloset, mengunci lemari obat serta bahan pembersih kimiawi, dan menyingkirkan kabel yang melintang di lantai.\n\n"
            "Menempelkan label gambar dan teks besar pada pintu kamar, lemari pakaian, dan dapur juga sangat membantu kemandirian spasial lansia."
        )
    },
    {
        "intent": "voice_caregiver_005",
        "category": "panduan_caregiver",
        "pattern": "bagaimana cara memandikan penderita alzheimer yang menolak mandi, tips memandikan lansia",
        "response": (
            "Menolak mandi sering kali bukan bentuk pembangkangan, melainkan rasa takut terhadap sensasi dingin, lantai licin, atau rasa malu saat pakaian dibuka.\n\n"
            "Pastikan ruangan kamar mandi hangat, gunakan air suam-suam kuku yang nyaman, tutupi tubuh pasien dengan handuk besar saat dibasuh bertahap, dan putar musik kesukaan mereka.\n\n"
            "Bila mandi konvensional memicu kepanikan hebat, membasuh tubuh menggunakan waslap busa hangat tanpa bilas adalah alternatif higienis yang sangat manusiawi."
        )
    },
    {
        "intent": "voice_caregiver_006",
        "category": "panduan_caregiver",
        "pattern": "orang tua tidak mengenali saya sebagai anaknya lagi, sakit hati orang tua lupa anak",
        "response": (
            "Mengalami momen ketika orang tua sendiri menatap Anda seperti orang asing adalah pengalaman emosional yang luar biasa menyakitkan bagi seorang anak.\n\n"
            "Ingatlah di dalam hati Anda bahwa yang melupakan Anda adalah **penyakit keroposnya sirkuit otak**, bukan hati nurani atau cinta kasih orang tua Anda yang sesungguhnya.\n\n"
            "Meskipun nama Anda memudar dari ingatannya, perasaan aman dan kehangatan kasih sayang yang Anda pancarkan lewat pelukan dan sentuhan lembut tetap dirasakan oleh jiwanya."
        )
    },
    {
        "intent": "voice_caregiver_007",
        "category": "panduan_caregiver",
        "pattern": "bagaimana mengatasi lansia yang sering menuduh pasangan selingkuh, cemburu patologis othello",
        "response": (
            "Waham cemburu patologis (*Othello Syndrome*) merupakan salah satu manifestasi neuropsikiatri demensia di mana penderita yakin pasangannya berkhianat.\n\n"
            "Gejala ini lahir dari rasa tidak aman yang ekstrem dan hilangnya pemahaman konteks usia akibat penurunan kognitif.\n\n"
            "Jangan pernah memperdebatkan tuduhan tersebut secara emosional; tanggapi dengan penegasan cinta yang menenangkan dan konsultasikan dengan dokter saraf untuk penanganan farmakoterapi bila perlu."
        )
    },
    {
        "intent": "voice_caregiver_008",
        "category": "panduan_caregiver",
        "pattern": "apa itu validation therapy, terapi validasi naomi feil, cara merespons halusinasi",
        "response": (
            "**Validation Therapy** adalah metode komunikasi humanistik yang dikembangkan untuk memvalidasi perasaan dan kebutuhan emosional di balik ucapan pasien demensia.\n\n"
            "Alih-alih menyangkal fakta yang keliru, Anda mendengarkan dan merespons emosi yang mendasarinya. Sebagai contoh, jika pasien mencari ibunya yang telah tiada, tanyakanlah: 'Ibu pasti sangat merindukan sosok ibu ya? Apa masakan terenak yang dulu sering beliau buatkan?'.\n\n"
            "Pendekatan ini menyembuhkan luka kecemasan batin dan mengembalikan rasa dihargai pada penderita."
        )
    },
    {
        "intent": "voice_caregiver_009",
        "category": "panduan_caregiver",
        "pattern": "bagaimana membuat jadwal rutinitas harian lansia, jadwal harian terstruktur",
        "response": (
            "Rutinitas harian yang konsisten dan terprediksi adalah jangkar penenang terbaik bagi pikiran penderita demensia yang rentan bingung.\n\n"
            "Tetapkan jam yang sama setiap hari untuk bangun pagi, sarapan, aktivitas fisik ringan, istirahat siang, mandi sore, dan persiapan tidur malam.\n\n"
            "Keteraturan ritme waktu mengurangi ketidakpastian lingkungan, meminimalkan kecemasan, dan membantu menstabilkan jam biologis sirkadian tubuh."
        )
    },
    {
        "intent": "voice_caregiver_010",
        "category": "panduan_caregiver",
        "pattern": "persiapan hukum dan keuangan keluarga, surat kuasa perwalian demensia, legal planning",
        "response": (
            "Menyiapkan rencana legalitas hukum dan keuangan saat penderita masih berada pada stadium awal (*mild stage*) dan masih memiliki kapasitas hukum (*competency*) adalah langkah yang sangat bijak.\n\n"
            "Langkah ini mencakup pembuatan surat kuasa pengampuan finansial (*Power of Attorney*), penunjukan wali medis, serta inventarisasi dokumen perbankan dan asuransi kesehatan.\n\n"
            "Kesiapan administrasi ini mencegah timbulnya konflik keluarga di kemudian hari dan memastikan kebutuhan perawatan pasien terjamin dengan lancar."
        )
    },
    {
        "intent": "voice_caregiver_011",
        "category": "panduan_caregiver",
        "pattern": "tips memilih suster pendamping perawat lansia, caregiver profesional",
        "response": (
            "Dalam memilih perawat pendamping (*formal caregiver*), kriteria terpenting melampaui keterampilan medis dasar adalah **kesabaran tinggi, empati emosional, dan pemahaman terhadap perilaku demensia**.\n\n"
            "Pastikan perawat memiliki pelatihan perawatan geriatri, tidak mudah tersinggung saat menghadapi pengulangan pertanyaan, dan mampu menjaga protokol keselamatan fisik lansia.\n\n"
            "Lakukan masa orientasi bersama keluarga selama 1 hingga 2 minggu pertama agar lansia merasa nyaman dan terbiasa dengan kehadiran pendamping baru."
        )
    },
    {
        "intent": "voice_caregiver_012",
        "category": "panduan_caregiver",
        "pattern": "apakah ada komunitas pendukung caregiver di indonesia, support group alzheimer",
        "response": (
            "Di Indonesia, organisasi nirlaba seperti **Alzheimer's Indonesia (ALZI)** menyediakan jejaring komunitas pendukung (*caregiver support group*) yang sangat aktif dan suportif.\n\n"
            "Bergabung dalam kelompok dukungan memberi Anda ruang aman untuk berbagi cerita, memperoleh wawasan praktis dari sesama pengasuh, dan menyadari bahwa Anda tidak sendirian dalam perjuangan ini.\n\n"
            "ALZI juga rutin menyelenggarakan program edukasi, senam otak, dan *memory cafe* yang sangat bermanfaat."
        )
    },
    {
        "intent": "voice_caregiver_013",
        "category": "panduan_caregiver",
        "pattern": "cara mengajak lansia berobat ke dokter saraf tanpa menakut-nakuti, trik ke dokter",
        "response": (
            "Hindari mengatakan 'kita mau periksa ke dokter saraf karena Ibu mulai pikun', karena kalimat ini dapat memicu stigma negatif dan penolakan keras dari lansia.\n\n"
            "Gunakan pendekatan pemeriksaan kesehatan umum yang netral dan wajar, seperti: 'Kita mau kontrol tensi dan cek kesehatan rutin tahunan agar stamina Ibu tetap bugar untuk jalan-jalan bersama cucu'.\n\n"
            "Hubungi pihak klinik atau dokter terlebih dahulu sebelum jadwal konsultasi agar dokter telah memahami maksud evaluasi kognitif tanpa membuat pasien canggung."
        )
    },
    {
        "intent": "voice_caregiver_014",
        "category": "panduan_caregiver",
        "pattern": "menghadapi rasa bersalah caregiver, merasa bukan anak yang berbakti, guilt caregiver",
        "response": (
            "Rasa bersalah (*caregiver guilt*)—seperti merasa kurang sabar, sempat mengeluh lelah, atau merasa tidak mampu memberikan perawatan sempurna—adalah beban emosional yang lazim dirasakan pengasuh.\n\n"
            "Maafkanlah diri Anda sendiri; Anda adalah manusia biasa dengan keterbatasan energi fisik dan psikologis, bukan malaikat tanpa lelah.\n\n"
            "Tolak ukur bakti Anda terbukti dari kehadiran dan komitmen Anda mendampingi mereka setiap hari di tengah segala tantangan yang ada."
        )
    },
    {
        "intent": "voice_caregiver_015",
        "category": "panduan_caregiver",
        "pattern": "kapan waktu yang tepat mempertimbangkan panti rawat wredha nursing home, panti jompo",
        "response": (
            "Mempertimbangkan fasilitas perawatan khusus (*memory care / nursing home*) bukanlah bentuk penelantaran atau kegagalan cinta kasih keluarga.\n\n"
            "Keputusan ini menjadi rasional dan penuh tanggung jawab apabila kebutuhan medis pasien sudah menuntut pengawasan 24 jam penuh yang tidak lagi dapat disediakan secara aman di rumah, atau ketika kesehatan fisik pengasuh keluarga telah terancam kolaps.\n\n"
            "Pilihlah fasilitas yang memiliki reputasi profesional, rasio staf yang memadai, dan lingkungan yang memanusiakan lansia secara bermartabat."
        )
    },

    # =========================================================================
    # KELOMPOK 9: RUJUKAN DOKTER SPESIALIS NEUROLOGI & KLINIS (10 Data)
    # =========================================================================
    {
        "intent": "voice_klinis_001",
        "category": "rujukan_medis",
        "pattern": "kapan saya harus ke dokter spesialis saraf, tanda harus periksa ke spesialis",
        "response": (
            "Konsultasi ke **Dokter Spesialis Neurologi (Sp.N)** sangat dianjurkan jika keluhan lupa mulai mengganggu kelancaran pekerjaan, kemandirian keuangan, atau interaksi sosial sehari-hari.\n\n"
            "Tanda-tanda bahaya lain meliputi tersesat di jalan pulang, perubahan kepribadian mendadak, kesulitan berbicara yang makin nyata, atau keluhan memori yang memburuk secara progresif dalam rentang 6 bulan terakhir.\n\n"
            "Deteksi pada fase *Mild Cognitive Impairment* membuka jendela peluang intervensi yang jauh lebih efektif untuk mempertahankan kualitas hidup pasien."
        )
    },
    {
        "intent": "voice_klinis_002",
        "category": "rujukan_medis",
        "pattern": "apa obat yang biasa diresepkan dokter saraf untuk alzheimer, donepezil memantine",
        "response": (
            "Dokter spesialis saraf umumnya meresepkan dua kelompok obat utama yang telah disetujui badan pengawas obat internasional untuk menstabilkan fungsi kognitif.\n\n"
            "Pertama adalah kelompok **Inhibitor Kolinesterase** (seperti Donepezil, Rivastigmine, dan Galantamine) yang bekerja meningkatkan kadar neurotransmiter asetilkolin di otak. Kedua adalah **Antagonis Reseptor NMDA** (seperti Memantine) yang melindungi sel saraf dari kerusakan akibat kelebihan zat glutamat.\n\n"
            "Seluruh obat ini merupakan obat keras yang wajib dikonsumsi di bawah resep dan evaluasi berkala dokter spesialis saraf."
        )
    },
    {
        "intent": "voice_klinis_003",
        "category": "rujukan_medis",
        "pattern": "apa obat baru terapi antibodi lecanemab donanemab, obat pembersih plak amiloid",
        "response": (
            "Terapi antibodi monoklonal generasi baru seperti **Lecanemab (Leqembi)** dan **Donanemab (Kisunla)** merupakan terobosan ilmiah pertama yang mampu memperlambat progresi penyakit dengan membersihkan plak beta-amiloid di otak.\n\n"
            "Namun, obat-obat ini ditujukan secara spesifik hanya untuk pasien stadium sangat awal (*Early-stage / MCI*) dengan bukti konfirmasi biomarker amiloid positif.\n\n"
            "Terapi infus berkala ini menuntut pemantauan MRI serial yang sangat ketat untuk mengawasi efek samping pembengkakan atau perdarahan mikro di otak (*ARIA*)."
        )
    },
    {
        "intent": "voice_klinis_004",
        "category": "rujukan_medis",
        "pattern": "apa saja yang harus disiapkan sebelum ke dokter saraf, persiapan konsultasi neurologi",
        "response": (
            "Agar sesi konsultasi dokter berjalan optimal dan akurat, siapkan dokumen riwayat kesehatan berikut sebelum berangkat:\n\n"
            "1. Catatan kronologis contoh kejadian lupa atau perubahan perilaku nyata selama beberapa bulan terakhir.\n"
            "2. Daftar lengkap seluruh obat rutin, vitamin, dan suplemen yang sedang dikonsumsi pasien beserta dosisnya.\n"
            "3. Hasil pemeriksaan laboratorium darah, rontgen, atau CT-scan/MRI kepala terdahulu bila ada.\n\n"
            "Kehadiran anggota keluarga yang tinggal serumah sangat krusial untuk memberikan informasi pengamatan harian yang objektif kepada dokter."
        )
    },
    {
        "intent": "voice_klinis_005",
        "category": "rujukan_medis",
        "pattern": "apa beda dokter spesialis saraf neurologi dan psikiater geriatri, dokter mana yang dituju",
        "response": (
            "Kedua dokter spesialis ini saling melengkapi dalam tata laksana komprehensif penyakit neurokognitif geriatri.\n\n"
            "**Dokter Spesialis Neurologi (Sp.N)** berfokus mendalam pada penegakan diagnosis struktural otak, pemetaan fungsi saraf, evaluasi biomarker, dan terapi farmakologis penstabil memori. Sementara itu, **Psikiater Geriatri (Sp.KJ Konsultan Geriatri)** memiliki keahlian khusus dalam menangani komplikasi perilaku berat, depresi lansia, psikosis, dan agitasi.\n\n"
            "Untuk langkah pertama evaluasi keluhan daya ingat, berkonsultasi ke Dokter Spesialis Saraf adalah pintu masuk yang paling tepat."
        )
    },
    {
        "intent": "voice_klinis_006",
        "category": "rujukan_medis",
        "pattern": "apakah alzheimer bisa sembuh total, apakah ada obat penyembuh permanen",
        "response": (
            "Hingga saat ini, ilmu kedokteran dunia belum menemukan obat yang dapat menyembuhkan kerusakan neurodegeneratif penyakit Alzheimer secara total atau mengembalikan jaringan otak yang telah mati.\n\n"
            "Namun, tata laksana medis modern yang memadukan farmakoterapi dini, stimulasi kognitif terstruktur, diet MIND, dan modifikasi lingkungan terbukti mampu **memperlambat laju perburukan penyakit secara signifikan**.\n\n"
            "Intervensi dini memungkinkan pasien menikmati tahun-tahun kehidupan yang berharga dengan kualitas fungsional dan kemandirian yang jauh lebih baik."
        )
    },
    {
        "intent": "voice_klinis_007",
        "category": "rujukan_medis",
        "pattern": "apa beda alzheimer dan demensia vaskular, demensia pasca stroke",
        "response": (
            "Perbedaan utamanya terletak pada mekanisme penyebab kerusakan sel saraf di dalam otak.\n\n"
            "**Alzheimer** disebabkan oleh penumpukan protein toksik amiloid dan tau yang merusak sinaps secara bertahap dan perlahan. Sedangkan **Demensia Vaskular** dipicu oleh penyumbatan atau perdarahan pembuluh darah otak (seperti pasca stroke) yang menyebabkan kematian jaringan otak secara mendadak dengan pola penurunan kognitif bertangga (*step-wise decline*).\n\n"
            "Banyak lansia yang sebenarnya mengalami demensia tipe campuran (*mixed dementia*) yang menggabungkan kedua patologi ini."
        )
    },
    {
        "intent": "voice_klinis_008",
        "category": "rujukan_medis",
        "pattern": "apa itu demensia lewy body dan frontotemporal, jenis demensia lain",
        "response": (
            "Selain Alzheimer, terdapat tipe demensia degeneratif penting lainnya yang memiliki karakteristik unik.\n\n"
            "**Dementia with Lewy Bodies (DLB)** ditandai oleh fluktuasi tajam kesadaran, halusinasi visual yang hidup sejak awal, dan gejala kekakuan gerak mirip Parkinson. Sedangkan **Frontotemporal Dementia (FTD)** menyerang lobus depan dan samping otak pada usia lebih muda, dengan manifestasi awal berupa perubahan drastis perilaku sosial, hilangnya rasa malu, atau gangguan bicara (*afasia*).\n\n"
            "Pembedaan diagnosis ini sangat menentukan pemilihan jenis obat yang aman bagi pasien."
        )
    },
    {
        "intent": "voice_klinis_009",
        "category": "rujukan_medis",
        "pattern": "apa peran fisioterapi dan terapi okupasi untuk demensia, terapi rehabilitasi",
        "response": (
            "Layanan rehabilitasi medis memegang peranan krusial dalam mempertahankan kapasitas fisik dan kemandirian penderita.\n\n"
            "**Fisioterapi** berfokus pada latihan keseimbangan, kekuatan otot tungkai, dan kelancaran pola jalan untuk mencegah bahaya jatuh. Sementara itu, **Terapi Okupasi** melatih kembali adaptasi melakukan tugas-tugas harian praktis dengan menggunakan alat bantu yang mempermudah pasien di rumah.\n\n"
            "Kombinasi kedua terapi ini juga memberikan stimulasi sensorik yang menyegarkan suasana hati lansia."
        )
    },
    {
        "intent": "voice_klinis_010",
        "category": "rujukan_medis",
        "pattern": "bagaimana status skrining neura di mata hukum medis, legalitas hasil prediksi neura",
        "response": (
            "Hasil analisis dan kalkulasi probabilitas risiko yang dihasilkan oleh platform Neura AI berkedudukan sebagai **instrumen skrining awal dan edukasi kognitif (*early risk screening tool*)**.\n\n"
            "Platform Neura tidak menggantikan penilaian diagnosis formal, pemeriksaan fisik langsung, maupun keputusan terapeutik dari dokter spesialis neurologi yang berwenang.\n\n"
            "Gunakanlah laporan ringkasan Neura sebagai bahan rujukan awal yang konstruktif saat Anda berkonsultasi langsung ke fasilitas pelayanan kesehatan terdekat."
        )
    },

    # =========================================================================
    # KELOMPOK 10: RESPONS SUARA TERKENDALI & PERSONALISASI NAMA (5 Data)
    # =========================================================================
    {
        "intent": "voice_fallback_001",
        "category": "fallback_suara",
        "pattern": "harga saham hari ini, siapa presiden perancis, resep memasak rendang, lirik lagu barat",
        "response": (
            "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>.\n\n"
            "Sebagai asisten suara klinis Neura, lingkup keahlian saya didedikasikan secara khusus untuk konsultasi kesehatan kognitif, evaluasi keluhan memori, skrining awal penyakit Alzheimer, dan panduan gaya hidup sehat untuk otak.\n\n"
            "Silakan sampaikan pertanyaan atau gejala seputar kesehatan daya ingat Anda atau anggota keluarga, atau gunakan perintah suara untuk skrining risiko klinis."
        )
    },
    {
        "intent": "voice_fallback_002",
        "category": "fallback_suara",
        "pattern": "cuaca besok hujan tidak, ramalan zodiak hari ini, berita gosip artis terkini",
        "response": (
            "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>.\n\n"
            "Topik yang Anda tanyakan berada di luar domain basis data klinis kesehatan otak Neura AI. Saya siap mendampingi Anda jika ingin berdiskusi mengenai interpretasi skor tes MMSE, tips diet MIND, atau cara membedakan pikun wajar vs demensia.\n\n"
            "Apakah ada topik seputar kesehatan memori yang ingin Anda diskusikan bersama saya?"
        )
    },
    {
        "intent": "voice_fallback_003",
        "category": "fallback_suara",
        "pattern": "koding python membuat game, perbaiki error javascript, rumus fisika kuantum",
        "response": (
            "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>.\n\n"
            "Basis pengetahuan Neura Voice Assistant berfokus pada analisis 32 biomarker medis klinis, riwayat fungsional ADL, dan edukasi pencegahan neurodegeneratif lansia.\n\n"
            "Jika Anda tertarik mengetahui bagaimana model machine learning Neura memprediksi risiko Alzheimer dari data klinis, silakan ketik atau sampaikan pertanyaan tentang biomarker Neura."
        )
    },
    {
        "intent": "voice_fallback_004",
        "category": "fallback_suara",
        "pattern": "ceritakan lelucon lucu, tebak-tebakan humor, bernyanyilah untukku suara",
        "response": (
            "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>.\n\n"
            "Meskipun saya senang dapat menemani Anda dengan nada suara yang hangat dan ramah, fokus utama saya adalah memberikan panduan medis yang akurat dan terpercaya seputar kesehatan daya ingat keluarga Anda.\n\n"
            "Bagaimana kondisi konsentrasi dan daya ingat Anda hari ini? Ada yang terasa berbeda atau ingin Anda pastikan?"
        )
    },
    {
        "intent": "voice_fallback_005",
        "category": "fallback_suara",
        "pattern": "siapa pemenang piala dunia kemarin, rekomendasi film horor, beli tiket pesawat murah",
        "response": (
            "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>.\n\n"
            "Informasi tersebut berada di luar cakupan layanan asisten medis Neura AI. Anda dapat menanyakan tentang langkah awal perawatan demensia di rumah, rekomendasi latihan fisik untuk lansia, atau konsultasi mengenai hasil skor skrining.\n\n"
            "Silakan ajukan pertanyaan seputar kesehatan otak Anda kapan pun Anda siap."
        )
    },
    {
        "intent": "voice_stop_001",
        "category": "kontrol_suara",
        "pattern": "stop, berhenti, stop bicara, diam, cukup, tunggu dulu, berhenti bicara, pause",
        "response": (
            "Baik, saya telah menghentikan penjelasan sebelumnya.\n\n"
            "Saya sedang mendengarkan Anda dengan saksama. Silakan lanjutkan apa yang ingin Anda sampaikan atau tanyakan seputar kesehatan memori."
        )
    },
    {
        "intent": "voice_stop_002",
        "category": "kontrol_suara",
        "pattern": "sebentar, tunggu sebentar, tahan dulu, sudah cukup, batalkan",
        "response": (
            "Siap, saya jeda sejenak.\n\n"
            "Silakan ambil waktu Anda dengan santai. Kapan pun Anda siap melanjutkan konsultasi, Anda bisa langsung berbicara kepada saya."
        )
    }
]


def generate_voice_datasets():
    """Menulis datasets/voice_intents.csv, features/voice_dataset.json, dan memperbarui chat_intents.csv."""
    root_dir = Path(__file__).resolve().parent.parent
    datasets_dir = root_dir / "datasets"
    features_dir = root_dir / "features"
    raw_dir = root_dir / "data" / "raw"

    datasets_dir.mkdir(parents=True, exist_ok=True)
    features_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)

    print(f"Total entries in Voice Dataset: {len(VOICE_DATASET)}")

    # 1. Simpan datasets/voice_intents.csv
    csv_voice_path = datasets_dir / "voice_intents.csv"
    with open(csv_voice_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["intent", "category", "pattern", "response"])
        writer.writeheader()
        for item in VOICE_DATASET:
            writer.writerow({
                "intent": item["intent"],
                "category": item["category"],
                "pattern": item["pattern"],
                "response": item["response"]
            })
    print(f"[OK] Saved {csv_voice_path}")

    # 2. Simpan features/voice_dataset.json
    json_voice_path = features_dir / "voice_dataset.json"
    with open(json_voice_path, "w", encoding="utf-8") as f:
        json.dump(VOICE_DATASET, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved {json_voice_path}")

    # 3. Gabungkan juga ke datasets/chat_intents.csv & data/raw/chat_intents.csv agar ChatDatasetManager
    #    dan seluruh fitur Neura otomatis mengenali 100 voice intents ini!
    existing_chat_intents = {}
    csv_chat_path = datasets_dir / "chat_intents.csv"
    if csv_chat_path.exists():
        with open(csv_chat_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                intent_id = r.get("intent", "").strip()
                if intent_id:
                    existing_chat_intents[intent_id] = r

    # Tambahkan / update voice dataset
    added_count = 0
    for v in VOICE_DATASET:
        vid = v["intent"]
        if vid not in existing_chat_intents:
            added_count += 1
        existing_chat_intents[vid] = {
            "intent": vid,
            "pattern": v["pattern"],
            "response": v["response"]
        }

    # Tulis ulang datasets/chat_intents.csv
    with open(csv_chat_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["intent", "pattern", "response"])
        writer.writeheader()
        for row in existing_chat_intents.values():
            writer.writerow({
                "intent": row["intent"],
                "pattern": row["pattern"],
                "response": row["response"]
            })
    print(f"[OK] Updated {csv_chat_path} (added {added_count} new entries, total now {len(existing_chat_intents)})")

    # Sync data/raw/chat_intents.csv
    raw_chat_path = raw_dir / "chat_intents.csv"
    with open(raw_chat_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["intent", "pattern", "response"])
        writer.writeheader()
        for row in existing_chat_intents.values():
            writer.writerow({
                "intent": row["intent"],
                "pattern": row["pattern"],
                "response": row["response"]
            })
    print(f"[OK] Synced {raw_chat_path}")


if __name__ == "__main__":
    generate_voice_datasets()
