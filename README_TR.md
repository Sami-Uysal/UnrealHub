# UnrealHub — Çince Destekli Değiştirilmiş Sürüm

## Epic Games Launcher ve UnrealHub karşılaştırması

**Çok sürümlü UE geliştirme için yerel çalışma alanı: özyinelemeli keşif, proje sürüm grupları ve kaynak/kurulu motor ayrımı.**

| İş akışı | Epic Games Launcher | Bu UnrealHub fork'u |
| --- | --- | --- |
| Amaç | Resmî motor kurulumu ve içerik ekosistemi | **Bilgisayardaki mevcut motor ve projeleri yönetme** |
| Kopyalanan/alt dizindeki projeler | Epic, kopyalanan projelerin listeye girmeden önce yerel olarak açılmasını açıklar | **Belirlenen köklerde `.uproject` dosyalarını özyinelemeli bulma** |
| Tarama geri bildirimi | Belgelenen Library proje listesi iş akışı | **Bulundukça sonuç, dizin sayısı, geçerli yol ve yeniden tarama** |
| Motor türleri | Launcher derlenmiş motor kurar; kaynak derlemeler ayrı edinilir | **Kaynak ve kurulu motor grupları, sayısal sürüm sırası** |
| Proje sürümleri | Projelerin uyumlu UE sürümü gösterilir | **Sürüm düğmeleri ve tüm sürümler için ayrı proje grupları** |
| Proje araçları | Açma, klasörde gösterme, kısayol, klonlama ve silme | **Etiket, favori, not, görev panosu, Git ve yapılandırma düzenleme** |
| Hesap ve arka plan | Motor indirmek için Epic girişi gerekir | **Yerel keşif için giriş gerekmez; kapatınca sistem tepsisi** |
| Motor kurulumu/güncelleme | Resmî kurulum ve güncelleme desteği | **Motor kurulum ve güncellemelerinde Epic araçlarını kullanın** |

**[Windows x64 paketlerini indir](https://github.com/GoldenDragons/UnrealHub/releases/latest)**

Kaynaklar: [Epic proje açma belgesi](https://dev.epicgames.com/documentation/en-us/unreal-engine/opening-an-existing-unreal-engine-project), [kurulum belgesi](https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine). Bu tablo belgelenen iş akışlarını karşılaştırır; doğrulanmamış eksik özellik veya hız/bellek iddiası içermez. Marketplace ve güvenlik sınırlamaları aşağıdadır.


[简体中文](README.md) · [English](README_EN.md) · [Değişiklik günlüğü](CHANGELOG.md)

Bu depo, [Sami-Uysal/UnrealHub](https://github.com/Sami-Uysal/UnrealHub) 1.6.1 tabanlı, GoldenDragons tarafından sürdürülen açık bir fork'tur. Sami Uysal'ın adı, kaynak geçmişi ve [MIT lisansı](LICENSE) korunur. Resmî üst kaynak sürümü değildir.

Güncel sürüm: **1.6.2-zh.2**. [Windows x64 kurulum ve taşınabilir paketlerini indir](https://github.com/GoldenDragons/UnrealHub/releases/latest).

## Başlıca değişiklikler

- Pencere kapatıldığında sistem tepsisinde çalışmaya devam eder. Tepsi simgesi pencereyi geri getirir; çıkış menüsü uygulamayı tamamen kapatır. Tekrar açmak mevcut pencereyi gösterir.

- Basitleştirilmiş Çince desteği, dil seçimi ve seçimin saklanması; Türkçe ve İngilizce korunur.
- Marketplace açıldığında tüm pencerenin boş kalmasına neden olan hata düzeltildi.
- Motor ve proje klasörleri alt klasörleriyle birlikte taranır; bulunan sonuçlar tarama bitmeden gösterilir.
- Tarama ilerlemesi, hata bildirimi ve yeniden tarama düğmesi eklendi. Büyük dizinlerde sınırlı eşzamanlılık ve ortak tarama görevleri kullanılır.
- Kaynak kod motorları ve kurulu motorlar ayrı gruplarda, gerçek sayısal sürüme göre sıralanır.
- Proje sürümleri yan yana düğmelerle seçilir. Tüm sürümler görünümünde her UE sürümünün kendi başlığı, sayısı ve proje grubu vardır.

Ayrıntılı sürüm geçmişi ve doğrulama kapsamı için [CHANGELOG.md](CHANGELOG.md).

## Yeni arayüz

Görseller gerçek **1.6.2-zh.2 exe** dosyasından, büyütülmüş 1920×1032 pencere ve bağımsız örnek projeler kullanılarak alınmıştır. Eski üst kaynak görselleri kullanılmaz.

![UE sürümüne göre proje grupları](github-assets/projects-all-fullscreen.png)

![Kaynak kod ve kurulu motor grupları](github-assets/engines-fullscreen.png)

Derleme komutu: `npm.cmd ci` ve `npm.cmd run build -- --publish never`. Çıktı: `release/1.6.2-zh.2/`. Çalıştırmak için Node.js gerekmez.

Kurulum, Epic girişi ve indirmeler kabul testinden geçirilmemiştir. Önceden belirlenen token saklama güvenlik sorunları bu sürümde giderilmemiştir. İşletim ve tarama ayrıntıları [Çince kılavuzda](README_ZH.md) açıklanır.
