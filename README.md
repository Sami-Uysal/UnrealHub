# UnrealHub

**TR** | [EN](README_EN.md)


Unreal Engine motorlarını ve projelerini tek bir yerde toplayan masaüstü uygulaması.  
Kişisel kullanım için geliştirilmiştir.

![UnrealHub Screenshot](public/u.png)

## Özellikler

- **Projeler**: Tüm UE projelerinizi görüntüleyin ve tek tıkla başlatın
- **Motorlar**: Yüklü Unreal Engine sürümlerini listeleyin
- **Kolay Ekleme**: Sürükle-bırak veya dosya seçici ile proje ekleyin
- **Özelleştirme**: Proje isimlerini ve kapak resimlerini değiştirin
- **Etiket Sistemi**: Projelere etiket ekleyin ve etiketlere göre filtreleyin
- **Git Entegrasyonu**: Commit geçmişini ve dalları görselleştirin (Ayarlardan açılabilir)
- **Çoklu Dil**: Türkçe ve İngilizce arayüz desteği
- **Sağ Tık Menüsü**: Özelleştirilebilir bağlam menüsü (Ayarlardan yapılandırılabilir)
- **Config Editörü**: `.uproject` dosyasını uygulama içinden düzenleyin

## Kurulum

[Releases](https://github.com/Sami-Uysal/UnrealHub/releases) sayfasından en son `.exe` dosyasını indirip çalıştırın.

## Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# Kurulum dosyası oluştur
npm run build
```

Kurulum dosyası `release/` klasöründe oluşturulur.

## Teknolojiler

- Electron
- React + TypeScript
- Vite
- TailwindCSS
