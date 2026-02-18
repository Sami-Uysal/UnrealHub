# UnrealHub

[TR](README.md) | **EN**

A desktop application that gathers Unreal Engine engines and projects in one place.  
Developed for personal use.

![UnrealHub Screenshot](public/u.png)

## Features

- **Projects**: View all your UE projects and launch them with a single click
- **Engines**: List installed Unreal Engine versions
- **Easy Addition**: Add projects via drag-and-drop or file picker
- **Customization**: Change project names and cover images
- **Tag System**: Add tags to projects and filter by tags
- **Git Integration**: Visualize commit history and branches (can be enabled in Settings)
- **Localization**: Turkish and English interface support
- **Context Menu**: Customizable right-click menu (configurable in Settings)
- **Config Editor**: Edit `.uproject` files directly from the app

## Installation

Download and run the latest `.exe` file from the [Releases](https://github.com/Sami-Uysal/UnrealHub/releases) page.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build
```

The installer is created in the `release/` folder.

## Technologies

- Electron
- React + TypeScript
- Vite
- TailwindCSS
