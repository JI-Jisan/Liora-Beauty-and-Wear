$batPath = "C:\Users\atiku\OneDrive\Documents\Jisan Project\Liora-Beauty-and-Wear\run_ogerio_stock_sync.bat"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$batPath`" --scheduled"
$trigger1 = New-ScheduledTaskTrigger -Daily -At 9:00AM
$trigger2 = New-ScheduledTaskTrigger -Daily -At 9:00PM
Register-ScheduledTask -TaskName "Liora_Ogerio_Stock_Sync" -Action $action -Trigger @($trigger1, $trigger2) -Description "Daily auto stock sync between Ogerio and Liora Beauty" -Force
Write-Host "✅ Auto Sync Scheduled Task successfully registered in Windows!"
