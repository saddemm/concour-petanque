#!/usr/bin/env python3
"""
Test complet de tous les modes et types d'équipes
"""

import json
import subprocess
import sys
import time

BASE_URL = 'http://localhost:3000'

def api_call(method, endpoint, data=None):
    cmd = ['curl', '-s']
    if method != 'GET':
        cmd.extend(['-X', method])
    cmd.append(f'{BASE_URL}{endpoint}')
    cmd.extend(['-H', 'Content-Type: application/json'])
    if data:
        cmd.extend(['-d', json.dumps(data)])
    result = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(result.stdout)
    except:
        return {'error': 'Parse error', 'raw': result.stdout[:500]}

def test_tournament(num_teams, team_type, game_mode):
    """Test d'un tournoi"""
    players_per_team = {'TETE_A_TETE': 1, 'DOUBLETTE': 2, 'TRIPLETTE': 3}.get(team_type, 2)

    # Créer le concours
    result = api_call('POST', '/api/contests', {
        'name': f'Test {game_mode} {team_type} {num_teams}',
        'teamType': team_type,
        'gameMode': game_mode
    })
    if 'error' in result or 'id' not in result:
        return False, f"Erreur création: {result}"

    contest_id = result['id']

    if game_mode == 'MONTE':
        # Créer les équipes
        for i in range(1, num_teams + 1):
            players = [{'name': f'J{i}{chr(65+j)}', 'order': j+1} for j in range(players_per_team)]
            api_call('POST', f'/api/contests/{contest_id}/teams', {'players': players})
    else:  # MELEE
        # Ajouter les joueurs individuels
        num_players = num_teams * players_per_team
        for i in range(1, num_players + 1):
            api_call('POST', f'/api/contests/{contest_id}/melee-players', {'name': f'J{i}'})

    # Générer le tirage
    result = api_call('POST', f'/api/contests/{contest_id}/draw')
    if 'error' in result:
        api_call('DELETE', f'/api/contests/{contest_id}')
        return False, f"Erreur tirage: {result}"

    # Jouer les matchs de qualification
    for _ in range(100):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0
        for rd in contest.get('qualificationRounds', []):
            for m in rd.get('matches', []):
                if m['status'] != 'FINISHED' and not m.get('isBye'):
                    home, away = m.get('homeTeam'), m.get('awayTeam')
                    if home and away:
                        api_call('PATCH', f'/api/contests/{contest_id}/qualification-matches/{m["id"]}',
                                {'winnerTeamId': home['id']})
                        played += 1
        if played == 0:
            break

    # Jouer les matchs de brackets
    for _ in range(50):
        contest = api_call('GET', f'/api/contests/{contest_id}')
        played = 0
        for bracket in contest.get('brackets', []):
            for rd in bracket.get('rounds', []):
                for m in rd.get('matches', []):
                    if m.get('isBye') or m['status'] == 'FINISHED':
                        continue
                    home, away = m.get('homeTeam'), m.get('awayTeam')
                    if home and away:
                        api_call('PATCH', f'/api/contests/{contest_id}/bracket-matches/{m["id"]}',
                                {'winnerTeamId': home['id']})
                        played += 1
        if played == 0:
            break

    # Vérifier les finales
    contest = api_call('GET', f'/api/contests/{contest_id}')
    success = True
    errors = []

    for bracket in contest.get('brackets', []):
        finale = None
        for rd in bracket.get('rounds', []):
            if 'Finale' in rd.get('roundName', '') and rd.get('matches'):
                finale = rd['matches'][0]
                break

        if finale:
            if finale['status'] == 'FINISHED' or finale.get('isBye'):
                pass
            else:
                home, away = finale.get('homeTeam'), finale.get('awayTeam')
                if not home or not away:
                    success = False
                    errors.append(f"Bracket {bracket['type']}: Finale incomplète")
                else:
                    success = False
                    errors.append(f"Bracket {bracket['type']}: Finale non jouée")
        else:
            success = False
            errors.append(f"Bracket {bracket['type']}: Pas de finale")

    # Nettoyer
    api_call('DELETE', f'/api/contests/{contest_id}')

    return success, "; ".join(errors) if errors else "OK"

def main():
    test_cases = [
        # (num_teams, team_type, game_mode)
        # TETE_A_TETE - Mode MONTE
        (12, 'TETE_A_TETE', 'MONTE'),
        (25, 'TETE_A_TETE', 'MONTE'),
        (50, 'TETE_A_TETE', 'MONTE'),

        # DOUBLETTE - Mode MONTE
        (12, 'DOUBLETTE', 'MONTE'),
        (33, 'DOUBLETTE', 'MONTE'),
        (49, 'DOUBLETTE', 'MONTE'),
        (64, 'DOUBLETTE', 'MONTE'),
        (80, 'DOUBLETTE', 'MONTE'),

        # TRIPLETTE - Mode MONTE
        (12, 'TRIPLETTE', 'MONTE'),
        (27, 'TRIPLETTE', 'MONTE'),
        (45, 'TRIPLETTE', 'MONTE'),

        # DOUBLETTE - Mode MELEE
        (12, 'DOUBLETTE', 'MELEE'),
        (33, 'DOUBLETTE', 'MELEE'),
        (50, 'DOUBLETTE', 'MELEE'),

        # TRIPLETTE - Mode MELEE
        (12, 'TRIPLETTE', 'MELEE'),
        (24, 'TRIPLETTE', 'MELEE'),
        (36, 'TRIPLETTE', 'MELEE'),
    ]

    print(f"\n{'='*70}")
    print(f"TEST DE TOUS LES MODES ET TYPES D'ÉQUIPES")
    print(f"{'='*70}\n")

    results = []
    failed = []

    for num_teams, team_type, game_mode in test_cases:
        success, msg = test_tournament(num_teams, team_type, game_mode)
        results.append((num_teams, team_type, game_mode, success))
        status = "✅" if success else "❌"
        label = f"{game_mode:5s} {team_type:12s} {num_teams:3d} équipes"
        print(f"{status} {label}: {msg}")
        if not success:
            failed.append((label, msg))
        time.sleep(0.1)

    # Résumé
    passed = sum(1 for r in results if r[3])
    total = len(results)

    print(f"\n{'='*70}")
    print(f"RÉSUMÉ: {passed}/{total} tests réussis")
    print(f"{'='*70}")

    if failed:
        print("\nÉCHECS:")
        for label, msg in failed:
            print(f"  ❌ {label}: {msg}")
        sys.exit(1)
    else:
        print("\n🎉 TOUS LES TESTS PASSENT!")
        sys.exit(0)

if __name__ == '__main__':
    main()
