export interface IColorPalette {
  onTrack: string;
  atRisk: string;
  offTrack: string;
  name: string;
  description: string;
}

export class ColorPaletteService {
  private static palettes: { [key: string]: IColorPalette } = {
    classic: {
      name: 'Classic',
      description: 'Traditional blue confirmed, warning yellow tentative, and error red canceled',
      onTrack: '#0078d4',    // SharePoint Blue
      atRisk: '#FBC02D',     // Warning Yellow
      offTrack: '#D32F2F'    // Error Red
    },


    nature: {
      name: 'Nature',
      description: 'Earth-toned palette inspired by nature',
      onTrack: '#2E7D32',    // Forest Green
      atRisk: '#FF8F00',     // Amber
      offTrack: '#D32F2F'    // More red coral
    },

    professional: {
      name: 'Professional',
      description: 'Sophisticated business colors',
      onTrack: '#00695C',    // Teal
      atRisk: '#FF8F00',     // Gold
      offTrack: '#C62828'    // More red burgundy
    },
    disa1: {
      name: 'DISA Standard',
      description: 'DISA Standard - Medium Blue, Gold, Shield Red',
      onTrack: '#0072bc',    // Medium Blue
      atRisk: '#ffd520',     // Gold
      offTrack: '#a90533'    // Shield Red
    },
    disa2: {
      name: 'DISA Authority',
      description: 'DISA Authority - Crest Blue, Gold, Shield Red',
      onTrack: '#003976',    // Crest Blue
      atRisk: '#ffd520',     // Gold
      offTrack: '#a90533'    // Shield Red
    },

    disa4: {
      name: 'DISA Tactical',
      description: 'DISA Tactical - Crest Blue, Brown, Deep Red',
      onTrack: '#003976',    // Crest Blue
      atRisk: '#5f4d3b',     // Brown
      offTrack: '#781214'    // Deep Red
    },

    forest: {
      name: 'Forest',
      description: 'Forest palette - Web Forest Green, Fluorescent Orange, Amaranth Red',
      onTrack: '#238823',    // Web Forest Green
      atRisk: '#FFBF00',     // Fluorescent Orange
      offTrack: '#D2222D'    // Amaranth Red
    },
    emerald: {
      name: 'Emerald',
      description: 'Emerald palette - Pakistan Green, Fluorescent Orange, Amaranth Red',
      onTrack: '#007000',    // Pakistan Green
      atRisk: '#FFBF00',     // Fluorescent Orange
      offTrack: '#D2222D'    // Amaranth Red
    },
    disa1Deep: {
      name: 'DISA Standard Deep',
      description: 'DISA Standard with Deep Red - Medium Blue, Gold, Deep Red',
      onTrack: '#0072bc',    // Medium Blue
      atRisk: '#ffd520',     // Gold
      offTrack: '#781214'    // Deep Red
    },
    disa2Deep: {
      name: 'DISA Authority Deep',
      description: 'DISA Authority with Deep Red - Crest Blue, Gold, Deep Red',
      onTrack: '#003976',    // Crest Blue
      atRisk: '#ffd520',     // Gold
      offTrack: '#781214'    // Deep Red
    }
  };

  public static getPalette(paletteKey: string): IColorPalette {
    return this.palettes[paletteKey] || this.palettes.classic;
  }

  public static getAllPalettes(): { [key: string]: IColorPalette } {
    return this.palettes;
  }

  public static getStatusColor(status: string, paletteKey: string): string {
    const palette = this.getPalette(paletteKey);

    switch (status) {
      case 'Confirmed':
        return palette.onTrack;
      case 'Tentative':
        return palette.atRisk;
      case 'Canceled':
        return palette.offTrack;
      default:
        return '#605e5c'; // Neutral gray for unknown status
    }
  }

  public static getStatusColorWithOpacity(status: string, paletteKey: string, opacity: number = 1): string {
    const color = this.getStatusColor(status, paletteKey);
    
    // Convert hex to rgba if opacity is not 1
    if (opacity !== 1) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    return color;
  }

  public static generateGradient(status: string, paletteKey: string): string {
    const baseColor = this.getStatusColor(status, paletteKey);
    const darkerColor = this.darkenColor(baseColor, 20);
    
    return `linear-gradient(to bottom, ${baseColor}, ${darkerColor} 50%, ${baseColor})`;
  }

  private static darkenColor(color: string, percent: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - Math.round(255 * percent / 100));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - Math.round(255 * percent / 100));

    // Use manual padding for compatibility with older TypeScript
    const rHex = r.toString(16).length === 1 ? '0' + r.toString(16) : r.toString(16);
    const gHex = g.toString(16).length === 1 ? '0' + g.toString(16) : g.toString(16);
    const bHex = b.toString(16).length === 1 ? '0' + b.toString(16) : b.toString(16);

    return `#${rHex}${gHex}${bHex}`;
  }

  public static getBorderColor(status: string, paletteKey: string): string {
    return this.darkenColor(this.getStatusColor(status, paletteKey), 30);
  }
}
