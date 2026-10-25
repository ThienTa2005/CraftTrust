"""Build review sheets from original photographs and actual browser screenshots."""
from pathlib import Path
import json
from PIL import Image, ImageOps, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
out=root/'outputs/3d-audit'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)

def sheet(items, columns, filename):
    cellw,cellh=400,510
    canvas=Image.new('RGB',(columns*cellw,((len(items)+columns-1)//columns)*cellh),'#f6f3ed')
    draw=ImageDraw.Draw(canvas)
    for i,(label,file) in enumerate(items):
        image=Image.open(file).convert('RGB')
        if file.name.startswith('t'):
            # Display crop only. The pipeline always receives the original file.
            image=image.crop((130,490,855,1470))
        image=ImageOps.contain(image,(390,460))
        x=(i%columns)*cellw;y=(i//columns)*cellh
        canvas.paste(image,(x+(cellw-image.width)//2,y+42))
        draw.text((x+12,y+12),label,fill='#19344d',font=font)
    canvas.save(out/filename)

sheet([(f'{version.upper()} {view}',out/version/f'render-{view}.png') for version in ['baseline','after'] for view in ['front','back','left','right']],4,'before-after.png')
sheet([('Original FRONT',root.parent/'t1-3-1024x1536.jpg'),('Rendered FRONT',out/'after/render-front.png'),('Original BACK',root.parent/'t2-3-1024x1536.jpg'),('Rendered BACK',out/'after/render-back.png'),('Rendered LEFT - inferred',out/'after/render-left.png'),('Rendered RIGHT - inferred',out/'after/render-right.png')],3,'reference-comparison.png')
sheet([('Baseline foreground',out/'baseline/front-foreground.png'),('Repaired foreground',out/'after/front-foreground.png')],2,'segmentation-comparison.png')
metrics=json.loads((out/'comparison-metrics.json').read_text(encoding='utf-8'))
print({name:{k:r[k] for k in ['assetBytes','textureCoveragePercent','speculativeRegionPercent','silhouetteByView']} for name,r in metrics.items()})
