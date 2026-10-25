"""Regressions for mask leakage, projection, unsupported engines and mesh integrity."""
import json
import tempfile
import unittest
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw
from generate import segment_object, extract_ceramic_profile, construct_pottery_mesh, run_pipeline, fuse_multiview_textures
from texture_projection import project_textures
from quality_validation import validate_mesh
from ai_adapter import Hybrid3DManager
from multiview_reconstruction import preflight


def fixture(background, offset=0, color=(125, 65, 25)):
    image = Image.new("RGBA", (300, 420), background)
    draw = ImageDraw.Draw(image)
    draw.polygon([(95+offset,70),(205+offset,70),(225+offset,200),(190+offset,370),(110+offset,370),(75+offset,200)], fill=(*color,255))
    # Distinct left/right colors expose accidental reflection.
    draw.rectangle((110+offset,160,130+offset,240), fill=(210,40,20,255))
    return image


def view(image, direction="FRONT", angle=0):
    rgb, mask = segment_object(image)
    return {"rgb":rgb,"mask":mask,"profile":extract_ceramic_profile(mask),"direction":direction,"azimuth":angle}


class ReconstructionTests(unittest.TestCase):
    def test_gray_white_alpha_masks_and_texture(self):
        for bg in [(180,180,180,255),(255,255,255,255),(240,0,255,0)]:
            with self.subTest(background=bg):
                v=view(fixture(bg))
                self.assertEqual(int(v["mask"][100,10]),0)
                self.assertEqual(int(v["mask"][200,150]),1)
                texture, provenance, report=project_textures([v],v["profile"][4]/300,128)
                self.assertLess(int(texture[:,:,2].max()),45)
                self.assertGreater(report['speculativeRegionPercent'],50)
                self.assertEqual(report['backgroundLeakage']['sampledOutsideMask'],0)

    def test_shifted_back_alignment_contribution(self):
        a=view(fixture((255,255,255,255)))
        b=view(fixture((180,180,180,255),35,(20,70,150)),"BACK",180)
        radii=a['profile'][4]/300
        one,_,r1=project_textures([a],radii,128)
        two,_,r2=project_textures([a,b],radii,128)
        self.assertGreater(r2['sourceContributionPercent']['BACK-1'],25)
        self.assertGreater(r2['textureCoveragePercent'],r1['textureCoveragePercent'])
        self.assertGreater(float(two[:,0,2].mean()),float(one[:,0,2].mean())+50)
        self.assertLess(float(np.abs(two[:,64].astype(float)-one[:,64]).mean()),1)
        np.testing.assert_array_equal(two[:,0],two[:,-1])

    def test_back_mask_cannot_be_omitted(self):
        v=view(fixture((180,180,180,255)))
        cx,top,bottom,samples,radii=v['profile']
        with self.assertRaisesRegex(ValueError,'Back mask'):
            fuse_multiview_textures(v['rgb'],cx,samples,radii,top,bottom,back_rgb=v['rgb'],front_mask=v['mask'],back_azimuth=180)

    def test_back_camera_projection_is_not_mirrored(self):
        a=view(fixture((0,0,0,0)))
        b=view(fixture((0,0,0,0),color=(20,70,150)),"BACK",180)
        texture,_,_=project_textures([a,b],a['profile'][4]/300,128)
        self.assertGreater(int(texture[72,120,0]),150)  # left motif in BACK camera
        self.assertGreater(int(texture[72,8,2]),100)   # right blue surface in BACK camera

    def test_alpha_holes_remain_invalid(self):
        im=fixture((0,0,0,0)); ImageDraw.Draw(im).ellipse((140,140,160,160),fill=(255,255,255,0))
        _,mask=segment_object(im)
        self.assertEqual(mask[150,150],0)

    def test_four_views_all_contribute(self):
        views=[view(fixture((0,0,0,0),color=(40+i*30,50,80)),d,a)
               for i,(d,a) in enumerate([('FRONT',0),('RIGHT',90),('BACK',180),('LEFT',270)])]
        _,_,report=project_textures(views,views[0]['profile'][4]/300,128)
        self.assertTrue(all(v>15 for v in report['sourceContributionPercent'].values()))

    def test_bad_coordinates_rejected(self):
        v=view(fixture((0,0,0,0)))
        with self.assertRaises(ValueError): project_textures([v],np.full(128,np.nan),128)

    def test_ai_never_falls_back(self):
        for engine in ['ai','ai-trellis','ai-hunyuan','ai-triposr']:
            with self.assertRaises(RuntimeError): Hybrid3DManager().resolve_engine(engine,True)
        with self.assertRaises(ValueError): Hybrid3DManager().resolve_engine('multiview',False)

    def test_high_fidelity_rejects_two_views(self):
        with self.assertRaisesRegex(ValueError,'12'): preflight([{},{}])

    def test_mesh_normals_manifold_and_dimensions(self):
        parts,_,_=construct_pottery_mesh(np.linspace(50,70,128),100,60)
        report=validate_mesh(parts)
        self.assertTrue(report['edgeManifoldAfterWelding'])
        self.assertAlmostEqual(report['heightMeters'],1)
        self.assertAlmostEqual(report['widthMeters'],.6,places=6)
        broken=list(parts)
        p,n,u,i=broken[1]; broken[1]=(p,-n,u,i)
        with self.assertRaisesRegex(ValueError,'winding'): validate_mesh(broken)

    def test_relief_outlier_does_not_become_ring(self):
        im=fixture((0,0,0,0)); base=view(im)['profile'][4]
        ImageDraw.Draw(im).rectangle((225,180,275,220),fill=(125,65,25,255))
        relief=view(im)['profile'][4]
        self.assertLess(float(np.max(relief-base)),15)

    def test_honest_report_and_required_pose(self):
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp); fixture((0,0,0,0)).save(p/'f.png'); fixture((0,0,0,0),20).save(p/'b.png')
            kw=dict(front_path=str(p/'f.png'),back_path=str(p/'b.png'),output_path=str(p/'m.glb'),height_cm=30,width_cm=16)
            with self.assertRaisesRegex(ValueError,'camera'): run_pipeline(**kw)
            report=run_pipeline(**kw,back_azimuth=180)
            self.assertIsNone(report['confidenceScore'])
            self.assertGreater(report['speculativeRegionPercent'],0)
            self.assertTrue(report['publicationBlocked'])
            self.assertEqual(report['engine'],'ceramic-cpu')
            self.assertEqual(report['qualityStatus'],'NEEDS_REVIEW')

    def test_actual_dragon_images_masks(self):
        root=Path(__file__).resolve().parents[2]
        files=[root.parent/'t1-3-1024x1536.jpg',root.parent/'t2-3-1024x1536.jpg']
        if not all(p.exists() for p in files): self.skipTest('User supplied fixtures not available')
        front=view(Image.open(files[0])); back=view(Image.open(files[1]),'BACK',180)
        # This gray patch was erroneously foreground in the baseline mask.
        self.assertEqual(front['mask'][800,180],0)
        self.assertEqual(front['mask'][650,350],1)  # dragon retained
        _,_,report=project_textures([front,back],front['profile'][4]/883,256)
        self.assertGreater(report['sourceContributionPercent']['BACK-1'],25)
        self.assertGreater(report['speculativeRegionPercent'],15)


if __name__=='__main__': unittest.main()
