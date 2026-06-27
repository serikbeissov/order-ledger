"""CSV-экспорт (открывается в Excel; UTF-8 с BOM для кириллицы)."""
import csv

from django.http import HttpResponse


def csv_response(filename: str, header: list[str], rows) -> HttpResponse:
    # charset=utf-8 (НЕ utf-8-sig: иначе BOM добавляется на каждый write).
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("﻿")  # один BOM в начале — чтобы Excel понял кириллицу
    writer = csv.writer(response, delimiter=";")
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    return response
