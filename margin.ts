import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  ColorComponent,
  SliderComponent
} from 'obsidian';

interface PaperSettings {
  paperType: 'grid' | 'lined' | 'bullet';
  transparency: number;
  colour: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

interface GridSettings {
  gridSize: number;
}

interface LinedSettings {
  lineHeight: number;
}

interface BulletSettings {
  dotSize: number;
  dotSpacing: number;
}

interface PluginSettings {
  paper: PaperSettings;
  grid: GridSettings;
  lined: LinedSettings;
  bullet: BulletSettings;
}

const DEFAULT_SETTINGS: PluginSettings = {
  paper: {
    paperType: 'grid',
    transparency: 0.05,
    colour: 'rgba(255, 255, 255, 1)',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
  },
  grid: {
    gridSize: 50,
  },
  lined: {
    lineHeight: 20,
  },
  bullet: {
    dotSize: 5,
    dotSpacing: 20,
  },
};

export default class GridBackgroundPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();
    this.injectCSS();
    this.addSettingTab(new GridBackgroundSettingTab(this.app, this));
  }

  onunload() {
    const style = document.getElementById('paper-background-style');
    style?.remove();
  }

  injectCSS() {
    const style = document.createElement('style');
    style.id = 'paper-background-style';

    const { paperType, transparency, colour, marginTop, marginBottom, marginLeft, marginRight } = this.settings.paper;
    const rgb = colour.match(/\d+, \d+, \d+/)?.[0] ?? '255, 255, 255';
    let backgroundImage = '';
    let backgroundSize = 'auto';

    if (paperType === 'grid') {
      const { gridSize } = this.settings.grid;
      backgroundImage = `
        linear-gradient(to right, transparent ${gridSize - 1}px, rgba(${rgb}, ${transparency}) 1px),
        linear-gradient(to bottom, transparent ${gridSize - 1}px, rgba(${rgb}, ${transparency}) 1px)
      `;
      backgroundSize = `${gridSize}px ${gridSize}px`;
    } else if (paperType === 'lined') {
      const { lineHeight } = this.settings.lined;
      backgroundImage = `
        repeating-linear-gradient(
          to bottom,
          rgba(${rgb}, ${transparency}) 0px,
          rgba(${rgb}, ${transparency}) 1px,
          transparent 1px,
          transparent ${lineHeight}px
        )
      `;
    } else if (paperType === 'bullet') {
      const { dotSize, dotSpacing } = this.settings.bullet;
      backgroundImage = `
        radial-gradient(circle, rgba(${rgb}, ${transparency}) ${dotSize}px, transparent ${dotSize}px)
      `;
      backgroundSize = `${dotSpacing}px ${dotSpacing}px`;
    }

    const cssContent = `
      .markdown-source-view .cm-content,
      .markdown-preview-view {
        position: relative;
      }

      .markdown-source-view .cm-content::before,
      .markdown-preview-view::before {
        content: "";
        position: absolute;
        top: ${marginTop}px;
        bottom: ${marginBottom}px;
        left: ${marginLeft}px;
        right: ${marginRight}px;
        background-image: ${backgroundImage};
        background-size: ${backgroundSize};
        z-index: 0;
        pointer-events: none;
      }

      .markdown-source-view .cm-content > *,
      .markdown-preview-view > * {
        position: relative;
        z-index: 1;
      }
    `;

    style.textContent = cssContent;
    document.head.appendChild(style);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.onunload();
    this.injectCSS();
  }
}

class GridBackgroundSettingTab extends PluginSettingTab {
  plugin: GridBackgroundPlugin;
  sliderGridSize: SliderComponent;

  constructor(app: App, plugin: GridBackgroundPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Paper Background Settings' });

    new Setting(containerEl)
      .setName('Paper Type')
      .setDesc('Select the type of paper background')
      .addDropdown(dropdown => {
        dropdown
          .addOption('grid', 'Grid')
          .addOption('lined', 'Lined')
          .addOption('bullet', 'Bullet Journal')
          .setValue(this.plugin.settings.paper.paperType)
          .onChange(async (value) => {
            this.plugin.settings.paper.paperType = value as 'grid' | 'lined' | 'bullet';
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(containerEl)
      .setName('Transparency')
      .setDesc('Set the transparency level (0 to 1)')
      .addSlider(slider => {
        slider
          .setLimits(0, 1, 0.01)
          .setValue(this.plugin.settings.paper.transparency)
          .onChange(async (value) => {
            this.plugin.settings.paper.transparency = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Universal Colour')
      .setDesc('Set the colour for the lines/dots/grids')
      .addColorPicker(colour => {
        colour
          .setValue(this.plugin.settings.paper.colour)
          .onChange(async (value) => {
            const rgb = colour.getValueRgb();
            this.plugin.settings.paper.colour = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.plugin.settings.paper.transparency})`;
            await this.plugin.saveSettings();
          });
      });

    ['Top', 'Bottom', 'Left', 'Right'].forEach(side => {
      const key = `margin${side}` as keyof PaperSettings;

      new Setting(containerEl)
        .setName(`${side} Margin`)
        .setDesc(`Margin from the ${side.toLowerCase()} (in px)`)
        .addSlider(slider => {
          slider
            .setLimits(0, 200, 1)
            .setValue(this.plugin.settings.paper[key] as number)
            .onChange(async (value) => {
              (this.plugin.settings.paper[key] as number) = value;
              await this.plugin.saveSettings();
            });
        });
    });

    if (this.plugin.settings.paper.paperType === 'grid') {
      new Setting(containerEl)
        .setName('Grid Size')
        .setDesc('Set the size of the grid (in px)')
        .addSlider(slider => {
          slider
            .setLimits(20, 100, 1)
            .setValue(this.plugin.settings.grid.gridSize)
            .onChange(async (value) => {
              this.plugin.settings.grid.gridSize = value;
              await this.plugin.saveSettings();
            });
        });
    } else if (this.plugin.settings.paper.paperType === 'lined') {
      new Setting(containerEl)
        .setName('Line Height')
        .setDesc('Set the height between lines (in px)')
        .addSlider(slider => {
          slider
            .setLimits(10, 50, 1)
            .setValue(this.plugin.settings.lined.lineHeight)
            .onChange(async (value) => {
              this.plugin.settings.lined.lineHeight = value;
              await this.plugin.saveSettings();
            });
        });
    } else if (this.plugin.settings.paper.paperType === 'bullet') {
      new Setting(containerEl)
        .setName('Dot Size')
        .setDesc('Set the size of the dots (in px)')
        .addSlider(slider => {
          slider
            .setLimits(2, 10, 1)
            .setValue(this.plugin.settings.bullet.dotSize)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSize = value;
              await this.plugin.saveSettings();
            });
        });

      new Setting(containerEl)
        .setName('Dot Spacing')
        .setDesc('Set the spacing between dots (in px)')
        .addSlider(slider => {
          slider
            .setLimits(10, 50, 1)
            .setValue(this.plugin.settings.bullet.dotSpacing)
            .onChange(async (value) => {
              this.plugin.settings.bullet.dotSpacing = value;
              await this.plugin.saveSettings();
            });
        });
    }
  }
}
