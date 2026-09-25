"""Render bounded face-review views through the existing live Blender MCP connection."""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"outputs/sah-face"
GOAL="create this human in blender use advanced scultpting skills and make sure you match it exactly I need his face only for now"


def main(arguments):
    evidence=OUT/"mcp-evidence"
    evidence.mkdir(parents=True,exist_ok=True)
    report=[]
    for view in arguments.views.split(","):
        filename=OUT/arguments.folder/(view.lower()+".png")
        command=[sys.executable,str(ROOT/"scripts/blender_mcp_client.py"),"run",str(ROOT/"assets/sah-face/steps/render_view.py"),"--output",str(evidence),"--goal",GOAL,"--label",arguments.folder+"-"+view.lower(),"--param","RENDER_VIEW="+view,"--param","RENDER_FOLDER="+arguments.folder,"--param","RENDER_SIZE="+str(arguments.size),"--param","RENDER_SAMPLES="+str(arguments.samples),"--param","RENDER_LOOK="+arguments.look]
        started=time.time()
        result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding="utf-8",errors="replace",check=False)
        (evidence/(arguments.folder+"-"+view.lower()+".log")).write_text(result.stdout+result.stderr,encoding="utf-8")
        if result.returncode:
            print((result.stdout[-1800:]+result.stderr[-1000:]).encode("ascii","backslashreplace").decode("ascii"),flush=True)
            raise RuntimeError("Face render failed: "+view)
        assert filename.exists() and filename.stat().st_mtime>=started-2
        with filename.open("rb") as stream:
            assert stream.read(8)==b"\x89PNG\r\n\x1a\n"
        record={"view":view,"look":arguments.look,"path":str(filename.relative_to(OUT)),"bytes":filename.stat().st_size,"seconds":round(time.time()-started,2)}
        report.append(record)
        print(json.dumps(record),flush=True)
    (OUT/(arguments.folder+"-manifest.json")).write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("SAH_FACE_RENDER_SET_COMPLETE",len(report),flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--views",default="front,three_quarter,profile,top,reference_front")
    parser.add_argument("--folder",default="review")
    parser.add_argument("--look",choices=("neutral","clay"),default="neutral")
    parser.add_argument("--size",type=int,default=1000)
    parser.add_argument("--samples",type=int,default=32)
    main(parser.parse_args())
