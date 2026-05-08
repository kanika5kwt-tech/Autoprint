"""
printer_service.py - Windows-compatible version for AutoPrint demo
Replaces Linux CUPS (lp/lpstat) commands with Windows printing via win32print.
Falls back to simulation mode if win32print is not installed.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Detect platform
IS_WINDOWS = sys.platform == "win32"

# Try importing win32print (requires: pip install pywin32)
try:
    import win32print
    import win32api
    WIN32_AVAILABLE = True
    logger.info("win32print loaded — hardware printing enabled.")
except ImportError:
    WIN32_AVAILABLE = False
    logger.warning("pywin32 not installed — running in SIMULATION mode. "
                   "Run: pip install pywin32")


def get_default_printer() -> str:
    """Return the name of the default printer."""
    if WIN32_AVAILABLE:
        return win32print.GetDefaultPrinter()
    return "SimulatedPrinter (Canon LBP2900)"


def list_printers() -> list[dict]:
    """
    List all available printers on the system.
    Returns a list of dicts with 'name' and 'status' keys.
    """
    if WIN32_AVAILABLE:
        printers = []
        for flags in [win32print.PRINTER_ENUM_LOCAL, win32print.PRINTER_ENUM_CONNECTIONS]:
            try:
                for p in win32print.EnumPrinters(flags, None, 2):
                    printers.append({
                        "name": p["pPrinterName"],
                        "status": "ready" if p["Status"] == 0 else "busy",
                    })
            except Exception as e:
                logger.error(f"Error enumerating printers: {e}")
        return printers

    # Simulation fallback
    return [{"name": "SimulatedPrinter (Canon LBP2900)", "status": "ready"}]


def get_printer_status(printer_name: str = None) -> dict:
    """
    Get current status of a printer.
    Returns dict with 'name', 'status', 'jobs' keys.
    """
    if not printer_name:
        printer_name = get_default_printer()

    if WIN32_AVAILABLE:
        try:
            handle = win32print.OpenPrinter(printer_name)
            info = win32print.GetPrinter(handle, 2)
            win32print.ClosePrinter(handle)
            job_count = info.get("cJobs", 0)
            raw_status = info.get("Status", 0)
            status = "ready" if raw_status == 0 else "busy"
            return {"name": printer_name, "status": status, "jobs": job_count}
        except Exception as e:
            logger.error(f"Could not get printer status: {e}")
            return {"name": printer_name, "status": "error", "jobs": 0}

    # Simulation fallback
    return {"name": printer_name, "status": "ready", "jobs": 0}


def send_to_printer(
    file_path: str,
    printer_name: str = None,
    copies: int = 1,
    colour_mode: str = "bw",       # "bw" or "colour"
    sides: str = "single",         # "single" or "double"
    paper_size: str = "A4",
) -> dict:
    """
    Send a PDF file to the printer.

    On Windows with pywin32: uses ShellExecute print verb or win32api.
    Simulation mode: logs the job and returns success without printing.

    Returns:
        dict with 'success' (bool), 'job_id' (str|None), 'message' (str)
    """
    file_path = Path(file_path)

    if not file_path.exists():
        return {
            "success": False,
            "job_id": None,
            "message": f"File not found: {file_path}",
        }

    if not printer_name:
        printer_name = get_default_printer()

    logger.info(
        f"Sending to printer '{printer_name}': {file_path.name} "
        f"| copies={copies} | colour={colour_mode} | sides={sides}"
    )

    if WIN32_AVAILABLE:
        return _print_with_win32(file_path, printer_name, copies, colour_mode, sides, paper_size)
    else:
        return _simulate_print(file_path, printer_name, copies, colour_mode, sides, paper_size)


def _print_with_win32(file_path, printer_name, copies, colour_mode, sides, paper_size) -> dict:
    """
    Print using win32api ShellExecute — triggers Windows default PDF handler.
    This approach works without needing a full CUPS-like interface.
    """
    try:
        # Set the target printer as default temporarily if different
        current_default = win32print.GetDefaultPrinter()
        if printer_name != current_default:
            win32print.SetDefaultPrinter(printer_name)

        # Use ShellExecute with "print" verb — Windows handles PDF printing
        for _ in range(copies):
            win32api.ShellExecute(
                0,           # hwnd
                "print",     # verb
                str(file_path),
                None,        # parameters
                ".",         # working directory
                0            # show command (SW_HIDE)
            )

        # Restore default printer
        if printer_name != current_default:
            win32print.SetDefaultPrinter(current_default)

        logger.info(f"Print job sent successfully to {printer_name}")
        return {
            "success": True,
            "job_id": f"win_{file_path.stem}",
            "message": f"Sent to {printer_name}",
        }
    except Exception as e:
        logger.error(f"Windows print error: {e}")
        return {"success": False, "job_id": None, "message": str(e)}


def _simulate_print(file_path, printer_name, copies, colour_mode, sides, paper_size) -> dict:
    """Simulation mode — logs print intent without actually printing."""
    logger.info(
        f"[SIMULATION] PRINT JOB\n"
        f"  File    : {file_path.name}\n"
        f"  Printer : {printer_name}\n"
        f"  Copies  : {copies}\n"
        f"  Colour  : {colour_mode}\n"
        f"  Sides   : {sides}\n"
        f"  Paper   : {paper_size}\n"
        f"  Status  : Simulated success ✓"
    )
    return {
        "success": True,
        "job_id": f"sim_{file_path.stem}",
        "message": f"[SIMULATION] Would print to {printer_name}",
    }


def cancel_print_job(job_id: str, printer_name: str = None) -> dict:
    """
    Cancel a print job by ID.
    """
    if not printer_name:
        printer_name = get_default_printer()

    if WIN32_AVAILABLE:
        try:
            handle = win32print.OpenPrinter(printer_name)
            # job_id from win32 is numeric; strip any prefix we added
            numeric_id = int(job_id.split("_")[-1]) if "_" in job_id else int(job_id)
            win32print.SetJob(handle, numeric_id, 0, None, win32print.JOB_CONTROL_DELETE)
            win32print.ClosePrinter(handle)
            return {"success": True, "message": f"Job {job_id} cancelled"}
        except Exception as e:
            logger.error(f"Cancel job error: {e}")
            return {"success": False, "message": str(e)}

    # Simulation
    logger.info(f"[SIMULATION] Cancelled job {job_id}")
    return {"success": True, "message": f"[SIMULATION] Job {job_id} cancelled"}
