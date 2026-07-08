<%
Option Explicit
Response.Buffer = True
Response.ContentType = "application/json"
Response.Charset = "utf-8"
Response.CodePage = 65001
On Error Resume Next

Dim method
method = UCase(Request.ServerVariables("REQUEST_METHOD"))
If method <> "POST" Then
  Response.Status = "405 Method Not Allowed"
  Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Request failed" & Chr(34) & "}"
  Response.End
End If

Dim fso, appRoot, settingsPath, defaultPath, authPath
Set fso = Server.CreateObject("Scripting.FileSystemObject")
If Err.Number <> 0 Then Fail "500 Internal Server Error", "Request failed"
appRoot = Server.MapPath("/admin")
If Err.Number <> 0 Then Fail "500 Internal Server Error", "Request failed"
settingsPath = fso.BuildPath(appRoot, "admin-settings.json")
If Err.Number <> 0 Then Fail "500 Internal Server Error", "Request failed"
defaultPath = fso.BuildPath(appRoot, "admin-settings.default.json")
If Err.Number <> 0 Then Fail "500 Internal Server Error", "Request failed"
authPath = fso.BuildPath(appRoot & "\api", "auth.json")
If Err.Number <> 0 Then Fail "500 Internal Server Error", "Request failed"

Sub Fail(statusCode, msg)
  Response.Status = statusCode
  Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Request failed" & Chr(34) & "}"
  Response.End
End Sub

Function ReadFileText(path)
  On Error Resume Next
  Dim stm
  If Not fso.FileExists(path) Then
    ReadFileText = ""
    Exit Function
  End If
  Set stm = Server.CreateObject("ADODB.Stream")
  If Err.Number <> 0 Then
    Fail "500 Internal Server Error", "Request failed"
  End If
  stm.Type = 2
  stm.Charset = "utf-8"
  stm.Open
  stm.LoadFromFile path
  If Err.Number <> 0 Then
    Fail "500 Internal Server Error", "Request failed"
  End If
  ReadFileText = stm.ReadText
  stm.Close
End Function

Sub WriteFileText(path, text)
  On Error Resume Next
  Dim stm
  Set stm = Server.CreateObject("ADODB.Stream")
  If Err.Number <> 0 Then
    Fail "500 Internal Server Error", "Request failed"
  End If
  stm.Type = 2
  stm.Charset = "utf-8"
  stm.Open
  stm.WriteText text
  stm.SaveToFile path, 2
  If Err.Number <> 0 Then
    Fail "500 Internal Server Error", "Request failed"
  End If
  stm.Close
End Sub

Function ExtractJsonValue(jsonText, key)
  Dim token, startPos, valueStart, valueEnd
  token = Chr(34) & key & Chr(34) & ":"
  startPos = InStr(1, jsonText, token, vbTextCompare)
  If startPos = 0 Then
    ExtractJsonValue = ""
    Exit Function
  End If
  valueStart = InStr(startPos + Len(token), jsonText, Chr(34), vbTextCompare)
  If valueStart = 0 Then
    ExtractJsonValue = ""
    Exit Function
  End If
  valueEnd = InStr(valueStart + 1, jsonText, Chr(34), vbTextCompare)
  If valueEnd = 0 Then
    ExtractJsonValue = ""
    Exit Function
  End If
  ExtractJsonValue = Mid(jsonText, valueStart + 1, valueEnd - valueStart - 1)
End Function

Function Base64Decode(base64Text)
  Dim map, i, out, c1, c2, c3, c4, chr1, chr2, chr3
  map = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  base64Text = Replace(base64Text, vbCrLf, "")
  base64Text = Replace(base64Text, "=", "")
  out = ""
  i = 1
  Do While i <= Len(base64Text)
    c1 = InStr(1, map, Mid(base64Text, i, 1), vbBinaryCompare) - 1: i = i + 1
    c2 = InStr(1, map, Mid(base64Text, i, 1), vbBinaryCompare) - 1: i = i + 1
    c3 = InStr(1, map, Mid(base64Text, i, 1), vbBinaryCompare) - 1: i = i + 1
    c4 = InStr(1, map, Mid(base64Text, i, 1), vbBinaryCompare) - 1: i = i + 1

    If c1 < 0 Or c2 < 0 Then Exit Do
    chr1 = Chr(((c1 * 4) And 255) Or (c2 \ 16))
    out = out & chr1

    If c3 >= 0 Then
      chr2 = Chr((((c2 And 15) * 16) And 255) Or (c3 \ 4))
      out = out & chr2
    End If
    If c4 >= 0 Then
      chr3 = Chr((((c3 And 3) * 64) And 255) Or c4)
      out = out & chr3
    End If
  Loop
  Base64Decode = out
End Function

Sub RequireBasicAuth()
  Dim authHeader, raw, decoded, userPass, user, pass
  authHeader = Request.ServerVariables("HTTP_AUTHORIZATION")
  If authHeader = "" Then authHeader = Request.ServerVariables("AUTHORIZATION")
  If authHeader = "" Then
    Response.Status = "401 Unauthorized"
    Response.AddHeader "WWW-Authenticate", "Basic realm=""Admin Settings"""
    Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Unauthorized" & Chr(34) & "}"
    Response.End
  End If
  If LCase(Left(authHeader, 6)) <> "basic " Then
    Response.Status = "401 Unauthorized"
    Response.AddHeader "WWW-Authenticate", "Basic realm=""Admin Settings"""
    Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Unauthorized" & Chr(34) & "}"
    Response.End
  End If
  raw = Mid(authHeader, 7)
  decoded = Base64Decode(raw)
  userPass = decoded
  Dim p
  p = InStr(1, userPass, ":", 1)
  If p <= 0 Then
    Response.Status = "401 Unauthorized"
    Response.AddHeader "WWW-Authenticate", "Basic realm=""Admin Settings"""
    Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Unauthorized" & Chr(34) & "}"
    Response.End
  End If
  user = Left(userPass, p - 1)
  pass = Mid(userPass, p + 1)

  Dim creds, expectedUser, expectedPass
  creds = ReadFileText(authPath)
  expectedUser = ExtractJsonValue(creds, "username")
  expectedPass = ExtractJsonValue(creds, "password")
  If expectedUser = "" And expectedPass = "" Then
    Fail "500 Internal Server Error", "Request failed"
  End If
  If user <> expectedUser Or pass <> expectedPass Then
    Response.Status = "401 Unauthorized"
    Response.AddHeader "WWW-Authenticate", "Basic realm=""Admin Settings"""
    Response.Write "{" & Chr(34) & "error" & Chr(34) & ":" & Chr(34) & "Unauthorized" & Chr(34) & "}"
    Response.End
  End If
End Sub

RequireBasicAuth()

Dim json
json = ReadFileText(defaultPath)
If json = "" Then
  Fail "404 Not Found", "Request failed"
End If

WriteFileText settingsPath, json
Response.Status = "200 OK"
Response.Write json
Response.End
%>
