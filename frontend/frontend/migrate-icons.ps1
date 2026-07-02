
# MUI to Lucide Icon Migration Script
# This script replaces MUI icon imports with Lucide React equivalents in all JSX files

$srcPath = "G:\lab management\Lab-management\frontend\frontend\src"

# Mapping of MUI icon names to Lucide React icon names
$iconMap = @{
    'Add' = 'Plus'
    'AddCircle' = 'PlusCircle'
    'ArrowBack' = 'ArrowLeft'
    'ArrowForward' = 'ArrowRight'
    'Business' = 'Building2'
    'Biotech' = 'Microscope'
    'Build' = 'Wrench'
    'Category' = 'LayoutGrid'
    'Check' = 'Check'
    'CheckCircle' = 'CheckCircle'
    'Close' = 'X'
    'CloudUpload' = 'CloudUpload'
    'ContentCopy' = 'Copy'
    'Delete' = 'Trash2'
    'Description' = 'FileText'
    'Download' = 'Download'
    'Edit' = 'Pencil'
    'Email' = 'Mail'
    'Error' = 'AlertCircle'
    'ExpandLess' = 'ChevronUp'
    'ExpandMore' = 'ChevronDown'
    'FilterList' = 'Filter'
    'Grade' = 'Star'
    'Info' = 'Info'
    'KeyboardArrowDown' = 'ChevronDown'
    'KeyboardArrowUp' = 'ChevronUp'
    'LocalHospital' = 'Hospital'
    'LocationOn' = 'MapPin'
    'Lock' = 'Lock'
    'MoreVert' = 'MoreVertical'
    'MoreHoriz' = 'MoreHorizontal'
    'OpenInNew' = 'ExternalLink'
    'PeopleAlt' = 'Users'
    'Person' = 'User'
    'Phone' = 'Phone'
    'Print' = 'Printer'
    'Refresh' = 'RefreshCw'
    'Remove' = 'Minus'
    'Save' = 'Save'
    'Schedule' = 'Clock'
    'Science' = 'FlaskConical'
    'Search' = 'Search'
    'Security' = 'Shield'
    'Settings' = 'Settings'
    'Upload' = 'Upload'
    'Visibility' = 'Eye'
    'VisibilityOff' = 'EyeOff'
    'Warning' = 'AlertTriangle'
    'Work' = 'Briefcase'
    'CalendarToday' = 'Calendar'
    'Dashboard' = 'LayoutDashboard'
    'Assignment' = 'ClipboardList'
    'AssignmentTurnedIn' = 'ClipboardCheck'
    'FolderOpen' = 'FolderOpen'
    'Note' = 'StickyNote'
    'NoteAdd' = 'FilePlus'
    'Inventory' = 'Package'
    'ViewList' = 'List'
    'NavigateNext' = 'ChevronRight'
    'NavigateBefore' = 'ChevronLeft'
    'FirstPage' = 'ChevronsLeft'
    'LastPage' = 'ChevronsRight'
    'Timeline' = 'TrendingUp'
    'BarChart' = 'BarChart3'
    'PieChart' = 'PieChart'
    'Speed' = 'Gauge'
    'Engineering' = 'Settings'
    'FactCheck' = 'CheckSquare'
    'Assessment' = 'BarChart3'
    'StraightenIcon' = 'Ruler'
}

# Get all JSX files
$files = Get-ChildItem -Path $srcPath -Recurse -Include "*.jsx","*.js" | Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "build" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $hasChanges = $false
    
    # Find all MUI icon imports
    $muiImportPattern = 'import\s+(\w+)\s+from\s+"@mui/icons-material/(\w+)";?'
    $matches = [regex]::Matches($content, $muiImportPattern)
    
    if ($matches.Count -eq 0) { continue }
    
    $lucideImports = @{}
    $replacements = @{}
    
    foreach ($match in $matches) {
        $importName = $match.Groups[1].Value
        $muiName = $match.Groups[2].Value
        
        # Strip "Icon" suffix if present for matching
        $baseName = $muiName -replace 'Icon$', ''
        
        $lucideName = $iconMap[$baseName]
        if (-not $lucideName) {
            $lucideName = $iconMap[$muiName]
        }
        if (-not $lucideName) {
            # Fallback: use the MUI name as-is (may not exist in Lucide)
            $lucideName = $baseName
            Write-Host "WARNING: No mapping for $muiName in $($file.Name), using $lucideName"
        }
        
        $lucideImports[$lucideName] = $true
        $replacements[$importName] = $lucideName
        
        # Remove the MUI import line
        $content = $content -replace [regex]::Escape($match.Value) + "\r?\n?", ""
        $hasChanges = $true
    }
    
    if ($hasChanges) {
        # Add Lucide import at the top (after React import or after existing lucide import)
        $lucideImportStr = "import { " + ($lucideImports.Keys | Sort-Object | ForEach-Object { $_ }) -join ", " + " } from `"lucide-react`";"
        $lucideImportStr = "import {`n  " + (($lucideImports.Keys | Sort-Object) -join ",`n  ") + ",`n} from `"lucide-react`";"
        
        # Check if there's already a lucide-react import
        if ($content -match 'import\s*\{[^}]*\}\s*from\s*"lucide-react"') {
            # Merge with existing - for simplicity, add new ones
            # Skip adding duplicate import, the existing one should cover it
        } else {
            # Add after React import
            $content = $content -replace '(import React.*?;\r?\n)', "`$1$lucideImportStr`n"
        }
        
        # Replace JSX usage: <MuiIcon fontSize="small" /> -> <LucideIcon size={18} strokeWidth={2} />
        foreach ($key in $replacements.Keys) {
            $lucide = $replacements[$key]
            
            # Replace <MuiIcon ... /> patterns - handle self-closing tags
            # Simple replacement of component names
            $content = $content -replace "<$key\b", "<$lucide"
            $content = $content -replace "</$key>", "</$lucide>"
            
            # Replace fontSize="small" with size={18}
            $content = $content -replace 'fontSize="small"', 'size={18} strokeWidth={2}'
            $content = $content -replace 'fontSize="medium"', 'size={20} strokeWidth={2}'
            $content = $content -replace 'fontSize="large"', 'size={24} strokeWidth={2}'
            
            # Replace className="text-xxx" patterns that use MUI's className
            # Keep as-is since Lucide also accepts className
        }
        
        # Clean up any double blank lines
        $content = $content -replace '\n{3,}', "`n`n"
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Migrated: $($file.Name)"
    }
}

Write-Host "`nMigration complete!"
