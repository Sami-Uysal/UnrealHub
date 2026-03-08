# UnrealHub
**Unreal Engine Geliştiricileri İçin Epic Games Launcher'a Hızlı ve Açık Kaynaklı Alternatif.**

**TR** | [EN](README_EN.md) | 🌐 **[Web Sitesi](https://unrealhub.samiuysal.me)**

Projenizi açmak için Epic Games Launcher'ın yüklenmesini beklemekten sıkıldınız mı? **UnrealHub**, Unreal Engine projelerinizi ve motor sürümlerinizi yönetmek için tasarlanmış, şimşek hızında ve hafif bir masaüstü uygulamasıdır.

![UnrealHub Screenshot](github-assets/projects-main.png)

## Epic Games Launcher vs UnrealHub

| Özellik | Epic Games Launcher | UnrealHub |
|---------|---------------------|-----------|
| **Açılış Hızı** | ~10-15 Saniye | **< 1 Saniye** |
| **Odak** | Mağaza ve Oyunlar | **Sadece Projeleriniz** |
| **Telemetri/Takip**| Var | **Yok (Açık Kaynak)** |
| **Çevrimdışı Çalışma** | Sıkıntılı | **Doğrudan (Native)** |

## Neden UnrealHub?

- **Anında Başlatma:** Tüm UE projelerinizi tek ekranda görün ve tek tıkla başlatın.
- **Gereksiz Yüklerden Arındırılmış:** Mağaza yok, reklam yok, arka planda çalışan takip uygulamaları yok.
### Motor Yönetimi
Yüklü tüm Unreal Engine sürümlerini otomatik algılar. Motorlarınızı tek bir ekranda görün ve yönetin.

<img src="github-assets/engine-versions.png" width="700">

### Gelişmiş Proje Yönetimi
Her projenin diskte kapladığı gerçek alanı görün. Sağ tık menüsü (Context Menu) ile projeleri anında kopyalayın, silin, `Saved`/`Intermediate` önbelleklerini temizleyin veya boyut kazanmak için akıllı **.zip yedekleri** alın.

<img src="github-assets/context-menu.png" width="700">

### Özelleştirme ve Etiketler
Proje isimlerini, kapak resimlerini değiştirin ve uygulamanın görünümünü özelleştirin.
<img src="github-assets/edit-project.png" width="700">

Projelerinize etiket (Tag) ekleyerek kendi düzeninizi yaratın.
<img src="github-assets/tag-system.png" width="700">

### Geliştiriciler İçin Güçlü Araçlar

**Proje Notları (Markdown Destekli)**
Projenizdeki fikirleri, alınacak notları ve detayları doğrudan uygulama içindeki notlar paneline yazın.
<img src="github-assets/project-notes.png" width="700">

**Görev Panosu (Kanban)**
Yerleşik sürükle-bırak görev panosu ile projelerinizin gidişatını yönetin.
<img src="github-assets/task-board.png" width="700">

**Git Entegrasyonu**
Commit geçmişini ve dalları doğrudan uygulama içinden görselleştirin.
<img src="github-assets/git-history.png" width="700">

**Eklenti ve Config Editörü**
Kapsamlı yerleşik editörü kullanarak `DefaultEngine.ini` gibi config dosyalarını veya aktif eklentileri (plugins) motoru açmadan kolayca düzenleyin!
<img src="github-assets/ini-editor.png" width="700">

## Kurulum

İş akışınızı hızlandırmaya hazır mısınız?

**[Releases sayfasından en son sürümü hemen indirin](https://github.com/Sami-Uysal/UnrealHub/releases)** 

*Tek tıkla kurulum: İndirin ve saniyeler içinde kullanmaya başlayın!*

## Flow Launcher Entegrasyonu
Üretkenliğinizi daha da artırın! Klavye üzerinden (`Alt + Boşluk`) anında arama ve proje başlatma yapmak için resmi **[Flow Launcher Eklentimizi](https://github.com/Sami-Uysal/Flow.Launcher.Plugin.UnrealHub)** kullanın.

## Geliştirme

<details>
<summary>Geliştirici talimatlarını görmek için tıklayın</summary>

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# Kurulum dosyası oluştur
npm run build
```

Kurulum dosyası `release/` klasöründe oluşturulur.

**Kullanılan Teknolojiler:** Electron, React + TypeScript, Vite, TailwindCSS
</details>

## Lisans
Bu proje açık kaynaklıdır ve tamamen ücretsizdir.
