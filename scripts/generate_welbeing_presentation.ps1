$ErrorActionPreference = 'Stop'

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-Rgb {
  param([int]$R, [int]$G, [int]$B)
  return $R + ($G * 256) + ($B * 65536)
}

function Resolve-AssetPath {
  param([string]$RelativePath)
  if ([string]::IsNullOrWhiteSpace($RelativePath)) { return $null }
  return (Join-Path $deckDir $RelativePath)
}

function Set-SlideBackground {
  param($Slide, [int]$Color)
  $Slide.FollowMasterBackground = 0
  $Slide.Background.Fill.Visible = -1
  $Slide.Background.Fill.Solid()
  $Slide.Background.Fill.ForeColor.RGB = $Color
}

function Add-ShapeBlock {
  param(
    $Slide,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [double]$Height,
    [int]$FillColor,
    [double]$Transparency = 0,
    [int]$LineColor = 0,
    [double]$LineTransparency = 1,
    [double]$LineWeight = 1,
    [int]$ShapeType = 1
  )

  $shape = $Slide.Shapes.AddShape($ShapeType, $Left, $Top, $Width, $Height)
  $shape.Fill.Visible = -1
  $shape.Fill.Solid()
  $shape.Fill.ForeColor.RGB = $FillColor
  $shape.Fill.Transparency = $Transparency
  $shape.Line.Visible = -1
  $shape.Line.ForeColor.RGB = $LineColor
  $shape.Line.Transparency = $LineTransparency
  $shape.Line.Weight = $LineWeight
  return $shape
}

function Add-Line {
  param(
    $Slide,
    [double]$X1,
    [double]$Y1,
    [double]$X2,
    [double]$Y2,
    [int]$Color,
    [double]$Weight = 1.5,
    [double]$Transparency = 0
  )

  $line = $Slide.Shapes.AddLine($X1, $Y1, $X2, $Y2)
  $line.Line.ForeColor.RGB = $Color
  $line.Line.Weight = $Weight
  $line.Line.Transparency = $Transparency
  return $line
}

function Set-TextStyle {
  param(
    $Shape,
    [string]$FontName = 'Aptos',
    [double]$FontSize = 20,
    [int]$Color = 0,
    [bool]$Bold = $false,
    [int]$Alignment = 1
  )

  $Shape.Line.Visible = 0
  $Shape.Fill.Visible = 0
  $Shape.TextFrame2.MarginLeft = 0
  $Shape.TextFrame2.MarginRight = 0
  $Shape.TextFrame2.MarginTop = 0
  $Shape.TextFrame2.MarginBottom = 0
  $Shape.TextFrame2.WordWrap = -1
  $Shape.TextFrame2.VerticalAnchor = 1
  $Shape.TextFrame2.TextRange.Font.Name = $FontName
  $Shape.TextFrame2.TextRange.Font.Size = $FontSize
  $Shape.TextFrame2.TextRange.Font.Bold = $(if ($Bold) { -1 } else { 0 })
  $Shape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = $Color
  $Shape.TextFrame2.TextRange.ParagraphFormat.Alignment = $Alignment
}

function Add-TextBox {
  param(
    $Slide,
    [string]$Text,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [double]$Height,
    [string]$FontName = 'Aptos',
    [double]$FontSize = 20,
    [int]$Color = 0,
    [bool]$Bold = $false,
    [int]$Alignment = 1
  )

  $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
  $shape.TextFrame2.TextRange.Text = $Text
  Set-TextStyle -Shape $shape -FontName $FontName -FontSize $FontSize -Color $Color -Bold:$Bold -Alignment $Alignment
  return $shape
}

function Add-CroppedImage {
  param(
    $Slide,
    [string]$Path,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [double]$Height
  )

  if (-not $Path -or -not (Test-Path $Path)) { return $null }

  $pic = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
  $pic.LockAspectRatio = -1
  $scale = [Math]::Max($Width / $pic.Width, $Height / $pic.Height)
  $pic.Width = $pic.Width * $scale
  $pic.Height = $pic.Height * $scale
  $pic.Left = $Left + (($Width - $pic.Width) / 2)
  $pic.Top = $Top + (($Height - $pic.Height) / 2)
  return $pic
}

function Add-FittedImage {
  param(
    $Slide,
    [string]$Path,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [double]$Height
  )

  if (-not $Path -or -not (Test-Path $Path)) { return $null }

  $pic = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
  $pic.LockAspectRatio = -1
  $scale = [Math]::Min($Width / $pic.Width, $Height / $pic.Height)
  $pic.Width = $pic.Width * $scale
  $pic.Height = $pic.Height * $scale
  $pic.Left = $Left + (($Width - $pic.Width) / 2)
  $pic.Top = $Top + (($Height - $pic.Height) / 2)
  return $pic
}

function Add-ScreenshotFrame {
  param(
    $Slide,
    [string]$Path,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [double]$Height,
    [int]$FrameColor,
    [double]$FrameTransparency = 0.12,
    [double]$ShadowTransparency = 0.62
  )

  $shadow = Add-ShapeBlock -Slide $Slide -Left ($Left + 14) -Top ($Top + 16) -Width $Width -Height $Height -FillColor $ColorInk -Transparency 0.78 -LineColor $ColorInk -LineTransparency 1
  $shadow.Shadow.Visible = 0 | Out-Null

  $frame = Add-ShapeBlock -Slide $Slide -Left ($Left - 12) -Top ($Top - 12) -Width ($Width + 24) -Height ($Height + 24) -FillColor $FrameColor -Transparency $FrameTransparency -LineColor $ColorWhite -LineTransparency 0.84 -LineWeight 1 -ShapeType 5
  $frame.Shadow.Visible = -1
  $frame.Shadow.Blur = 16
  $frame.Shadow.ForeColor.RGB = $ColorInk
  $frame.Shadow.Transparency = $ShadowTransparency
  $frame.Shadow.OffsetX = 0
  $frame.Shadow.OffsetY = 8

  $image = Add-CroppedImage -Slide $Slide -Path $Path -Left $Left -Top $Top -Width $Width -Height $Height
  if ($image -ne $null) {
    $image.Line.Visible = -1
    $image.Line.ForeColor.RGB = $ColorWhite
    $image.Line.Transparency = 0.82
  }
}

function Add-ChipTag {
  param(
    $Slide,
    [string]$Text,
    [double]$Left,
    [double]$Top,
    [int]$FillColor,
    [int]$TextColor,
    [double]$FillTransparency = 0.78,
    [double]$LineTransparency = 0.55
  )

  $width = 30 + ($Text.Length * 6.2)
  Add-ShapeBlock -Slide $Slide -Left $Left -Top $Top -Width $width -Height 24 -FillColor $FillColor -Transparency $FillTransparency -LineColor $FillColor -LineTransparency $LineTransparency -LineWeight 1 -ShapeType 5 | Out-Null
  Add-TextBox -Slide $Slide -Text $Text -Left ($Left + 12) -Top ($Top + 5) -Width ($width - 24) -Height 14 -FontSize 9.5 -Color $TextColor -Bold:$true | Out-Null
  return $width
}

function Add-ListItem {
  param(
    $Slide,
    [string]$Text,
    [double]$Left,
    [double]$Top,
    [int]$DotColor,
    [int]$TextColor,
    [double]$Width = 280,
    [double]$FontSize = 13
  )

  Add-ShapeBlock -Slide $Slide -Left $Left -Top ($Top + 6) -Width 8 -Height 8 -FillColor $DotColor -Transparency 0 -LineColor $DotColor -LineTransparency 1 -ShapeType 9 | Out-Null
  Add-TextBox -Slide $Slide -Text $Text -Left ($Left + 18) -Top $Top -Width $Width -Height 28 -FontSize $FontSize -Color $TextColor | Out-Null
}

function Add-MetricPill {
  param(
    $Slide,
    [string]$Label,
    [string]$Value,
    [double]$Left,
    [double]$Top,
    [double]$Width,
    [int]$FillColor,
    [int]$LabelColor,
    [int]$ValueColor,
    [double]$Transparency = 0.86
  )

  Add-ShapeBlock -Slide $Slide -Left $Left -Top $Top -Width $Width -Height 58 -FillColor $FillColor -Transparency $Transparency -LineColor $FillColor -LineTransparency 0.55 -LineWeight 1 -ShapeType 5 | Out-Null
  Add-TextBox -Slide $Slide -Text $Label.ToUpper() -Left ($Left + 12) -Top ($Top + 10) -Width ($Width - 24) -Height 12 -FontSize 8.5 -Color $LabelColor -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Value -Left ($Left + 12) -Top ($Top + 24) -Width ($Width - 24) -Height 20 -FontName 'Georgia' -FontSize 18 -Color $ValueColor -Bold:$true | Out-Null
}

function Add-Kicker {
  param(
    $Slide,
    [string]$Text,
    [double]$Left,
    [double]$Top,
    [bool]$DarkMode = $true,
    [double]$LineWidth = 112
  )
  $color = $(if ($DarkMode) { $ColorWarmMuted } else { $ColorMutedDark })
  Add-Line -Slide $Slide -X1 $Left -Y1 $Top -X2 ($Left + $LineWidth) -Y2 $Top -Color $ColorCopper -Weight 2.1 -Transparency 0.05 | Out-Null
  Add-TextBox -Slide $Slide -Text $Text -Left $Left -Top ($Top + 10) -Width 320 -Height 18 -FontSize 10 -Color $color -Bold:$true | Out-Null
}

function Add-Footer {
  param($Slide, [int]$PageNumber, [bool]$DarkMode = $true)
  $lineColor = $(if ($DarkMode) { $ColorLineDark } else { $ColorLineLight })
  $textColor = $(if ($DarkMode) { $ColorWarmMuted } else { $ColorMutedDark })
  Add-Line -Slide $Slide -X1 52 -Y1 512 -X2 908 -Y2 512 -Color $lineColor -Weight 1 -Transparency 0.18 | Out-Null
  Add-TextBox -Slide $Slide -Text 'Welbeing' -Left 52 -Top 516 -Width 120 -Height 14 -FontName 'Georgia' -FontSize 9 -Color $textColor -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text ("0{0}" -f $PageNumber) -Left 866 -Top 514 -Width 42 -Height 16 -FontSize 10 -Color $textColor -Bold:$true -Alignment 3 | Out-Null
}

function Build-CoverSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorPaper
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorPaper -LineColor $ColorPaper -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 640 -Top 0 -Width 320 -Height 540 -FillColor $ColorStone -Transparency 0.1 -LineColor $ColorStone -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 96 -FillColor $ColorIvory -LineColor $ColorIvory -LineTransparency 1 | Out-Null

  Add-FittedImage -Slide $Slide -Path (Resolve-AssetPath $Content.backgroundImage) -Left 702 -Top 38 -Width 196 -Height 118 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 702 -Top 38 -Width 196 -Height 118 -FillColor $ColorInk -Transparency 0.42 -LineColor $ColorWhite -LineTransparency 0.84 -LineWeight 0.8 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 58 -Top 58 -DarkMode:$false -LineWidth 128
  Add-TextBox -Slide $Slide -Text $Content.title -Left 58 -Top 136 -Width 260 -Height 78 -FontName 'Georgia' -FontSize 40 -Color $ColorInk -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text 'Wellbeing yang lebih engaging.' -Left 58 -Top 212 -Width 334 -Height 82 -FontName 'Georgia' -FontSize 28 -Color $ColorInk -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.subtitle -Left 58 -Top 308 -Width 300 -Height 88 -FontSize 16 -Color $ColorMutedDark | Out-Null

  $chipLeft = 58
  foreach ($chip in $Content.chips) {
    $chipWidth = Add-ChipTag -Slide $Slide -Text $chip -Left $chipLeft -Top 414 -FillColor $ColorCopperSoft -TextColor $ColorCopper -FillTransparency 0.82 -LineTransparency 0.48
    $chipLeft += $chipWidth + 10
  }

  Add-TextBox -Slide $Slide -Text $Content.footer.ToUpper() -Left 58 -Top 454 -Width 280 -Height 16 -FontSize 10 -Color $ColorCopper -Bold:$true | Out-Null

  Add-ScreenshotFrame -Slide $Slide -Path (Resolve-AssetPath $Content.featureImage) -Left 480 -Top 120 -Width 350 -Height 270 -FrameColor $ColorStone -FrameTransparency 0.08 -ShadowTransparency 0.72
  Add-Line -Slide $Slide -X1 446 -Y1 112 -X2 446 -Y2 396 -Color $ColorCopper -Weight 3 -Transparency 0.04 | Out-Null
  Add-TextBox -Slide $Slide -Text 'Dashboard sebagai pusat cerita produk.' -Left 480 -Top 416 -Width 320 -Height 20 -FontSize 10.5 -Color $ColorMutedDark -Bold:$true | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$false
}

function Build-OverviewSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorCharcoal
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorCharcoal -LineColor $ColorCharcoal -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 372 -Width 960 -Height 168 -FillColor $ColorInk -Transparency 0.18 -LineColor $ColorInk -LineTransparency 1 | Out-Null
  Add-FittedImage -Slide $Slide -Path (Resolve-AssetPath $Content.backgroundImage) -Left 640 -Top 54 -Width 230 -Height 126 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 640 -Top 54 -Width 230 -Height 126 -FillColor $ColorInk -Transparency 0.46 -LineColor $ColorWhite -LineTransparency 0.86 -LineWeight 0.8 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 58 -Top 58 -DarkMode:$true -LineWidth 104
  Add-TextBox -Slide $Slide -Text $Content.title -Left 58 -Top 138 -Width 420 -Height 118 -FontName 'Georgia' -FontSize 31 -Color $ColorWhite -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 58 -Top 270 -Width 380 -Height 54 -FontSize 16 -Color $ColorWarmMuted | Out-Null

  Add-Line -Slide $Slide -X1 58 -Y1 352 -X2 876 -Y2 352 -Color $ColorLineDark -Weight 1.1 -Transparency 0.14 | Out-Null

  $cardLeft = 58
  $bulletIndex = 0
  foreach ($item in $Content.bullets) {
    Add-TextBox -Slide $Slide -Text ("0{0}" -f ($bulletIndex + 1)) -Left $cardLeft -Top 388 -Width 32 -Height 18 -FontName 'Georgia' -FontSize 18 -Color $ColorCopper -Bold:$true | Out-Null
    Add-TextBox -Slide $Slide -Text $item -Left $cardLeft -Top 416 -Width 212 -Height 42 -FontSize 13 -Color $ColorWhite | Out-Null
    Add-TextBox -Slide $Slide -Text $Content.statLabels[$bulletIndex] -Left $cardLeft -Top 470 -Width 212 -Height 14 -FontSize 9 -Color $ColorWarmMuted -Bold:$true | Out-Null
    $cardLeft += 260
    $bulletIndex += 1
  }

  Add-TextBox -Slide $Slide -Text 'Bukan sekadar tracking. Ini pengalaman wellbeing yang lebih mudah diikuti.' -Left 640 -Top 206 -Width 222 -Height 86 -FontName 'Georgia' -FontSize 18 -Color $ColorWhite -Bold:$true | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$true
}

function Build-DashboardSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorIvory
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorIvory -LineColor $ColorIvory -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 286 -Height 540 -FillColor $ColorStone -Transparency 0.18 -LineColor $ColorStone -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 724 -Top 66 -Width 160 -Height 124 -FillColor $ColorCopperSoft -Transparency 0.4 -LineColor $ColorCopperSoft -LineTransparency 1 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 52 -Top 58 -DarkMode:$false -LineWidth 98
  Add-TextBox -Slide $Slide -Text $Content.title -Left 52 -Top 134 -Width 190 -Height 104 -FontName 'Georgia' -FontSize 28 -Color $ColorInk -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 52 -Top 252 -Width 190 -Height 70 -FontSize 14.5 -Color $ColorMutedDark | Out-Null

  $stepTop = 350
  $stepIndex = 1
  foreach ($item in $Content.flow) {
    Add-TextBox -Slide $Slide -Text ("0{0}" -f $stepIndex) -Left 52 -Top $stepTop -Width 30 -Height 18 -FontName 'Georgia' -FontSize 16 -Color $ColorCopper -Bold:$true | Out-Null
    Add-TextBox -Slide $Slide -Text $item -Left 88 -Top ($stepTop - 2) -Width 154 -Height 34 -FontSize 10.5 -Color $ColorInk | Out-Null
    $stepTop += 38
    $stepIndex += 1
  }

  Add-TextBox -Slide $Slide -Text 'Dashboard View' -Left 330 -Top 68 -Width 120 -Height 16 -FontSize 10.5 -Color $ColorCopper -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text 'Satu layar yang langsung menjelaskan progress pengguna.' -Left 330 -Top 92 -Width 260 -Height 20 -FontSize 11 -Color $ColorMutedDark -Bold:$true | Out-Null
  Add-ScreenshotFrame -Slide $Slide -Path (Resolve-AssetPath $Content.featureImage) -Left 330 -Top 126 -Width 470 -Height 308 -FrameColor $ColorWhite -FrameTransparency 0.05 -ShadowTransparency 0.72

  Add-ShapeBlock -Slide $Slide -Left 732 -Top 82 -Width 142 -Height 86 -FillColor $ColorInk -Transparency 0.06 -LineColor $ColorInk -LineTransparency 0.9 -LineWeight 0.8 -ShapeType 5 | Out-Null
  Add-TextBox -Slide $Slide -Text 'Lihat activity, point, dan akses fitur utama tanpa berpindah banyak halaman.' -Left 748 -Top 98 -Width 108 -Height 56 -FontSize 10.5 -Color $ColorInk | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$false
}

function Build-StravaSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorPaper
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 402 -Height 540 -FillColor $ColorCopper -Transparency 0.02 -LineColor $ColorCopper -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 402 -Top 0 -Width 558 -Height 540 -FillColor $ColorPaper -LineColor $ColorPaper -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 54 -Top 320 -Width 248 -Height 156 -FillColor $ColorInk -Transparency 0.12 -LineColor $ColorWhite -LineTransparency 0.86 -LineWeight 0.8 -ShapeType 5 | Out-Null
  Add-FittedImage -Slide $Slide -Path (Resolve-AssetPath $Content.backgroundImage) -Left 70 -Top 336 -Width 216 -Height 124 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 54 -Top 58 -DarkMode:$true -LineWidth 104
  Add-TextBox -Slide $Slide -Text $Content.title -Left 54 -Top 132 -Width 270 -Height 98 -FontName 'Georgia' -FontSize 29 -Color $ColorWhite -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 54 -Top 244 -Width 286 -Height 60 -FontSize 14.5 -Color $ColorWhite | Out-Null

  $bulletTop = 408
  foreach ($item in $Content.bullets) {
    Add-ListItem -Slide $Slide -Text $item -Left 430 -Top $bulletTop -DotColor $ColorCopper -TextColor $ColorInk -Width 260 -FontSize 12.5
    $bulletTop += 32
  }

  Add-TextBox -Slide $Slide -Text 'Integrasi View' -Left 430 -Top 72 -Width 120 -Height 16 -FontSize 10.5 -Color $ColorCopper -Bold:$true | Out-Null
  Add-ScreenshotFrame -Slide $Slide -Path (Resolve-AssetPath $Content.featureImage) -Left 430 -Top 106 -Width 334 -Height 246 -FrameColor $ColorStone -FrameTransparency 0.08 -ShadowTransparency 0.72

  $chipLeft = 430
  foreach ($label in $Content.labels) {
    $chipWidth = Add-ChipTag -Slide $Slide -Text $label -Left $chipLeft -Top 374 -FillColor $ColorCopperSoft -TextColor $ColorCopper -FillTransparency 0.72 -LineTransparency 0.45
    $chipLeft += $chipWidth + 10
  }

  Add-Line -Slide $Slide -X1 400 -Y1 58 -X2 400 -Y2 482 -Color $ColorStone -Weight 1.2 -Transparency 0.16 | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$false
}

function Build-QuizSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorIvory
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorIvory -LineColor $ColorIvory -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 760 -Top 0 -Width 200 -Height 540 -FillColor $ColorStone -Transparency 0.2 -LineColor $ColorStone -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 54 -Top 346 -Width 344 -Height 106 -FillColor $ColorPaper -Transparency 0.12 -LineColor $ColorStone -LineTransparency 0.45 -LineWeight 1 -ShapeType 5 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 54 -Top 58 -DarkMode:$false -LineWidth 88
  Add-TextBox -Slide $Slide -Text $Content.title -Left 54 -Top 128 -Width 360 -Height 96 -FontName 'Georgia' -FontSize 30 -Color $ColorInk -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 54 -Top 238 -Width 330 -Height 56 -FontSize 15 -Color $ColorMutedDark | Out-Null

  Add-TextBox -Slide $Slide -Text 'Contoh pertanyaan' -Left 54 -Top 322 -Width 140 -Height 16 -FontSize 10 -Color $ColorCopper -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.question -Left 74 -Top 368 -Width 286 -Height 52 -FontName 'Georgia' -FontSize 20 -Color $ColorInk -Bold:$true | Out-Null

  $optionTop = 432
  foreach ($option in $Content.options) {
    Add-TextBox -Slide $Slide -Text ("- {0}" -f $option) -Left 74 -Top $optionTop -Width 154 -Height 18 -FontSize 10.5 -Color $ColorMutedDark | Out-Null
    $optionTop += 16
  }

  Add-TextBox -Slide $Slide -Text $Content.resultText -Left 256 -Top 428 -Width 112 -Height 38 -FontSize 9.5 -Color $ColorMutedDark | Out-Null
  Add-TextBox -Slide $Slide -Text 'Survey View' -Left 560 -Top 82 -Width 120 -Height 16 -FontSize 10.5 -Color $ColorCopper -Bold:$true | Out-Null
  Add-ScreenshotFrame -Slide $Slide -Path (Resolve-AssetPath $Content.featureImage) -Left 560 -Top 116 -Width 202 -Height 334 -FrameColor $ColorWhite -FrameTransparency 0.04 -ShadowTransparency 0.74

  Add-ShapeBlock -Slide $Slide -Left 798 -Top 138 -Width 102 -Height 132 -FillColor $ColorInk -Transparency 0.06 -LineColor $ColorInk -LineTransparency 0.92 -LineWeight 0.8 -ShapeType 5 | Out-Null
  Add-TextBox -Slide $Slide -Text 'Input sederhana membantu membaca kondisi pengguna, bukan hanya aktivitasnya.' -Left 812 -Top 156 -Width 74 -Height 98 -FontSize 10.5 -Color $ColorInk | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$false
}

function Build-PointsSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorInk
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorInk -LineColor $ColorInk -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 320 -Height 540 -FillColor $ColorCharcoal -Transparency 0.04 -LineColor $ColorCharcoal -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 686 -Top 0 -Width 274 -Height 540 -FillColor $ColorCopper -Transparency 0.04 -LineColor $ColorCopper -LineTransparency 1 | Out-Null
  Add-FittedImage -Slide $Slide -Path (Resolve-AssetPath $Content.backgroundImage) -Left 714 -Top 286 -Width 196 -Height 142 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 714 -Top 286 -Width 196 -Height 142 -FillColor $ColorInk -Transparency 0.38 -LineColor $ColorWhite -LineTransparency 0.86 -LineWeight 0.8 | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 54 -Top 58 -DarkMode:$true -LineWidth 118
  Add-TextBox -Slide $Slide -Text $Content.title -Left 54 -Top 130 -Width 240 -Height 120 -FontName 'Georgia' -FontSize 24 -Color $ColorWhite -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 54 -Top 282 -Width 230 -Height 58 -FontSize 14 -Color $ColorWarmMuted | Out-Null

  $bulletTop = 366
  foreach ($item in $Content.bullets) {
    Add-ListItem -Slide $Slide -Text $item -Left 54 -Top $bulletTop -DotColor $ColorCopper -TextColor $ColorWhite -Width 220 -FontSize 12.5
    $bulletTop += 34
  }

  Add-TextBox -Slide $Slide -Text 'Leaderboard View' -Left 338 -Top 72 -Width 130 -Height 16 -FontSize 10.5 -Color $ColorWarmMuted -Bold:$true | Out-Null
  Add-ScreenshotFrame -Slide $Slide -Path (Resolve-AssetPath $Content.featureImage) -Left 338 -Top 106 -Width 316 -Height 238 -FrameColor $ColorFrameDark -FrameTransparency 0.08 -ShadowTransparency 0.74

  Add-MetricPill -Slide $Slide -Label $Content.metrics[0].label -Value $Content.metrics[0].value -Left 338 -Top 374 -Width 102 -FillColor $ColorCopperSoft -LabelColor $ColorWarmMuted -ValueColor $ColorWhite -Transparency 0.78
  Add-MetricPill -Slide $Slide -Label $Content.metrics[1].label -Value $Content.metrics[1].value -Left 450 -Top 374 -Width 102 -FillColor $ColorCopperSoft -LabelColor $ColorWarmMuted -ValueColor $ColorWhite -Transparency 0.78
  Add-MetricPill -Slide $Slide -Label $Content.metrics[2].label -Value $Content.metrics[2].value -Left 562 -Top 374 -Width 118 -FillColor $ColorCopperSoft -LabelColor $ColorWarmMuted -ValueColor $ColorWhite -Transparency 0.78

  Add-TextBox -Slide $Slide -Text 'Kompetisi sehat membuat progress lebih terasa hidup.' -Left 714 -Top 110 -Width 174 -Height 74 -FontName 'Georgia' -FontSize 19 -Color $ColorWhite -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text 'Point menjadi bukti. Leaderboard menjadi dorongan sosial.' -Left 714 -Top 196 -Width 170 -Height 42 -FontSize 12 -Color $ColorWhite | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$true
}

function Build-ClosingSlide {
  param($Slide, $Content, [int]$PageNumber)

  Set-SlideBackground -Slide $Slide -Color $ColorPaper
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 0 -Width 960 -Height 540 -FillColor $ColorPaper -LineColor $ColorPaper -LineTransparency 1 | Out-Null
  Add-ShapeBlock -Slide $Slide -Left 0 -Top 318 -Width 960 -Height 222 -FillColor $ColorIvory -LineColor $ColorIvory -LineTransparency 1 | Out-Null
  Add-Line -Slide $Slide -X1 58 -Y1 380 -X2 338 -Y2 380 -Color $ColorCopper -Weight 2.1 -Transparency 0.02 | Out-Null
  Add-TextBox -Slide $Slide -Text 'Pitch deck pengguna dan tim' -Left 58 -Top 392 -Width 190 -Height 16 -FontSize 10 -Color $ColorCopper -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text 'Ringkas, visual, dan mudah dipresentasikan.' -Left 58 -Top 414 -Width 240 -Height 18 -FontSize 11 -Color $ColorMutedDark | Out-Null

  Add-Kicker -Slide $Slide -Text $Content.kicker -Left 58 -Top 58 -DarkMode:$false -LineWidth 86
  Add-TextBox -Slide $Slide -Text $Content.title -Left 58 -Top 132 -Width 540 -Height 100 -FontName 'Georgia' -FontSize 32 -Color $ColorInk -Bold:$true | Out-Null
  Add-TextBox -Slide $Slide -Text $Content.summary -Left 58 -Top 246 -Width 470 -Height 48 -FontSize 15.5 -Color $ColorMutedDark | Out-Null

  $pointTop = 138
  foreach ($item in $Content.closingPoints) {
    Add-Line -Slide $Slide -X1 644 -Y1 ($pointTop + 11) -X2 664 -Y2 ($pointTop + 11) -Color $ColorCopper -Weight 2.2 -Transparency 0.05 | Out-Null
    Add-TextBox -Slide $Slide -Text $item -Left 676 -Top $pointTop -Width 200 -Height 32 -FontSize 12.5 -Color $ColorInk -Bold:$true | Out-Null
    $pointTop += 54
  }

  Add-TextBox -Slide $Slide -Text $Content.footer.ToUpper() -Left 58 -Top 474 -Width 580 -Height 16 -FontSize 10 -Color $ColorCopper -Bold:$true | Out-Null
  Add-Footer -Slide $Slide -PageNumber $PageNumber -DarkMode:$false
}

function Write-PreviewHtml {
  param([string]$OutputPath, $Deck)

  $items = @()
  $index = 1
  foreach ($slide in $Deck.slides) {
    $num = '{0:D2}' -f $index
    $items += @"
      <section class="slide-card">
        <div class="slide-meta">
          <span class="slide-index">Slide $num</span>
          <div>
            <p>$($slide.kicker)</p>
            <h2>$($slide.title)</h2>
          </div>
        </div>
        <img src="./export/slide-$num.png" alt="Slide $num - $($slide.title)" />
      </section>
"@
    $index += 1
  }

  $html = @"
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welbeing Deck Preview</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f1ea;
      --paper: rgba(255,255,255,0.72);
      --line: rgba(28,29,33,0.09);
      --text: #1c1d21;
      --muted: #6a625a;
      --accent: #b26f49;
      --shadow: rgba(28,29,33,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Aptos", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(214,171,142,0.16), transparent 32%),
        linear-gradient(180deg, #fcf8f3 0%, #f0e8dd 100%);
      color: var(--text);
      padding: 48px 24px 80px;
    }
    .wrap { max-width: 1180px; margin: 0 auto; }
    .hero {
      display: grid;
      gap: 10px;
      margin-bottom: 32px;
      padding: 28px 30px;
      border: 1px solid var(--line);
      background: var(--paper);
      border-radius: 28px;
      box-shadow: 0 24px 60px var(--shadow);
      backdrop-filter: blur(10px);
    }
    .hero h1 {
      margin: 0;
      font-family: "Georgia", serif;
      font-size: 44px;
      line-height: 1.05;
    }
    .hero p {
      margin: 0;
      max-width: 760px;
      color: var(--muted);
      line-height: 1.6;
    }
    .slide-card {
      margin-top: 26px;
      padding: 18px;
      border-radius: 26px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.74);
      box-shadow: 0 20px 52px var(--shadow);
      backdrop-filter: blur(10px);
    }
    .slide-meta {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 14px;
    }
    .slide-meta h2 {
      margin: 4px 0 0;
      font-family: "Georgia", serif;
      font-size: 24px;
      line-height: 1.15;
    }
    .slide-meta p {
      margin: 0;
      color: var(--accent);
      font-size: 11px;
      letter-spacing: .12em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .slide-index {
      display: inline-flex;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(178,111,73,0.1);
      color: var(--accent);
      font-weight: 700;
      font-size: 12px;
      white-space: nowrap;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 18px;
      border: 1px solid rgba(28,29,33,0.06);
      background: #ffffff;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <p>Editorial luxury agency pitch deck</p>
      <h1>$($Deck.deckTitle)</h1>
      <p>$($Deck.deckSubtitle)</p>
    </header>
    $($items -join "`n")
  </div>
</body>
</html>
"@

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($OutputPath, $html, $utf8NoBom)
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $scriptRoot '..')).Path
$deckDir = Join-Path $repoRoot 'docs\presentations\welbeing-user-demo'
$exportDir = Join-Path $deckDir 'export'
$qaDir = Join-Path $deckDir 'qa'
$contentPath = Join-Path $deckDir 'slide-content.json'
$pptPath = Join-Path $deckDir 'welbeing-user-demo.pptx'
$previewPath = Join-Path $deckDir 'index.html'
$outputPptPath = $pptPath

$ColorInk = Get-Rgb 28 29 33
$ColorCharcoal = Get-Rgb 40 43 49
$ColorPaper = Get-Rgb 246 241 234
$ColorIvory = Get-Rgb 252 248 243
$ColorStone = Get-Rgb 222 213 201
$ColorTaupe = Get-Rgb 136 126 116
$ColorCopper = Get-Rgb 178 111 73
$ColorCopperSoft = Get-Rgb 214 171 142
$ColorSlate = Get-Rgb 111 120 130
$ColorWhite = Get-Rgb 250 248 244
$ColorWarmMuted = Get-Rgb 214 208 199
$ColorMutedDark = Get-Rgb 99 92 85
$ColorLineDark = Get-Rgb 111 115 120
$ColorLineLight = Get-Rgb 194 184 171
$ColorFrameDark = Get-Rgb 61 63 70

Ensure-Directory -Path $deckDir
Ensure-Directory -Path $exportDir
Ensure-Directory -Path $qaDir

if (-not (Test-Path $contentPath)) {
  throw "Deck content file not found at $contentPath"
}

Get-ChildItem -Path $exportDir -Filter '*.png' -ErrorAction SilentlyContinue | Remove-Item -Force

$deck = Get-Content -Raw $contentPath | ConvertFrom-Json
$ppt = $null
$presentation = $null

try {
  $ppt = New-Object -ComObject PowerPoint.Application
  $ppt.Visible = -1
  $presentation = $ppt.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  $slideIndex = 1
  foreach ($slideContent in $deck.slides) {
    $slide = $presentation.Slides.Add($slideIndex, 12)

    switch ($slideContent.type) {
      'cover' { Build-CoverSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'overview' { Build-OverviewSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'dashboard' { Build-DashboardSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'strava' { Build-StravaSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'quiz' { Build-QuizSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'points' { Build-PointsSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      'closing' { Build-ClosingSlide -Slide $slide -Content $slideContent -PageNumber $slideIndex }
      default { throw "Unknown slide type: $($slideContent.type)" }
    }

    $slideIndex += 1
  }

  if (Test-Path $pptPath) {
    try {
      Remove-Item $pptPath -Force
    }
    catch {
      $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
      $outputPptPath = Join-Path $deckDir "welbeing-user-demo-$timestamp.pptx"
    }
  }

  $presentation.SaveAs($outputPptPath)

  $slideNumber = 1
  foreach ($slide in $presentation.Slides) {
    $num = '{0:D2}' -f $slideNumber
    $slide.Export((Join-Path $exportDir "slide-$num.png"), 'PNG', 1600, 900)
    $slideNumber += 1
  }

  Write-PreviewHtml -OutputPath $previewPath -Deck $deck
  $presentation.Saved = -1
}
finally {
  if ($presentation -ne $null) {
    $presentation.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  }
  if ($ppt -ne $null) {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

Write-Output "Generated: $outputPptPath"
Write-Output "Preview:   $previewPath"
