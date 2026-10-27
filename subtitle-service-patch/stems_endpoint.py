# ---------------------------------------------------------------
# Paste into main.py of https://huggingface.co/spaces/arjungade/subtitle
# (anywhere after the existing `GET /projects/{project_id}/subtitle`
# route). Exposes the Step-1 separation output so Subtaro can copy
# the vocal / instrumental stems into Cloudinary for the user.
#
#   GET /projects/{project_id}/audio/vocal
#   GET /projects/{project_id}/audio/instrument
#
# Uses only names that already exist in main.py: app, Path,
# HTTPException, status, FileResponse, validate_project_id,
# OUTPUT_ROOT, _read_state.
# ---------------------------------------------------------------

@app.get("/projects/{project_id}/audio/{stem}")
async def get_project_audio_stem(project_id: str, stem: str):
    if stem not in ("vocal", "instrument"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"status": "not_found", "message": "stem must be 'vocal' or 'instrument'."},
        )

    project_id = validate_project_id(project_id)

    if not _read_state(project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"status": "not_found", "message": f"Project '{project_id}' does not exist."},
        )

    wav_path = OUTPUT_ROOT / project_id / "audios" / f"{stem}.wav"

    if not wav_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"status": "not_ready", "message": f"{stem}.wav has not been generated yet."},
        )

    return FileResponse(
        path=str(wav_path),
        media_type="audio/wav",
        filename=f"{project_id}-{stem}.wav",
    )
